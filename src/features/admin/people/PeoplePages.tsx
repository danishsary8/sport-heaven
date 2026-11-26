import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { isApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatUsd } from '../../../lib/i18n';
import { Button, EmptyState, Field, QueryView, Select, Skeleton, TextArea, useToast } from '../../../ui';
import { useBranches } from '../../catalog/api';
import { AdminOnly } from '../AdminLayout';
import { patch, post, useAdminMutation, useAdminQuery } from '../api';
import type { AdminQuestion, AdminReturn, AdminUser, Role } from '../types';
import { AdminPage, Pager, Pill, dateTime, human } from '../ui';

const errText = (e: unknown) => (isApiError(e) ? e.message : 'Something went wrong.');

function useParam(key: string, fallback = '') {
  const [params, setParams] = useSearchParams();
  const value = params.has(key) ? (params.get(key) ?? '') : fallback;
  const set = (v: string) => {
    const n = new URLSearchParams(params);
    n.delete('page');
    n.set(key, v);
    setParams(n);
  };
  return [value, set, Number(params.get('page') ?? 1), (p: number) => setParams((prev) => ((prev.set('page', String(p)), prev)))] as const;
}

export function UsersPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const query = { q: params.get('q') ?? undefined, role: params.get('role') ?? undefined, page: Number(params.get('page') ?? 1) };
  const users = useAdminQuery<{ users: AdminUser[]; total: number; page: number; pageSize: number }>(['users'], '/v1/admin/users', query);
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    n.delete('page');
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n);
  };
  return (
    <AdminOnly>
      <AdminPage title="Users">
        <div className="flex flex-wrap items-end gap-3">
          <form
            role="search"
            className="flex min-w-[220px] flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              set('q', q.trim());
            }}
          >
            <Field label="Search users" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Phone, name or email" className="flex-1" />
            <Button type="submit" variant="primary" className="self-end">
              Search
            </Button>
          </form>
          <Select label="Role" value={params.get('role') ?? ''} onChange={(e) => set('role', e.target.value)}>
            <option value="">Everyone</option>
            <option value="customer">Customers</option>
            <option value="staff">Staff</option>
            <option value="admin">Admins</option>
          </Select>
        </div>
        <QueryView query={users} skeleton={<Skeleton className="h-64 w-full" />} isEmpty={(d) => d.users.length === 0} empty={<EmptyState title="No users match" />}>
          {(d) => (
            <>
              <ul className="flex flex-col gap-3">
                {d.users.map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </ul>
              <Pager page={d.page} pageSize={d.pageSize} total={d.total} onPage={(p) => set('page', String(p))} />
            </>
          )}
        </QueryView>
      </AdminPage>
    </AdminOnly>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const toast = useToast();
  const me = useAuth().user;
  const branches = useBranches();
  const [role, setRole] = useState<Role>(user.role);
  const [branch, setBranch] = useState(user.staffBranchId ?? '');
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const saveRole = useAdminMutation((body: unknown) => patch(`/v1/admin/users/${user.id}/role`, body), [['users']]);
  const points = useAdminMutation((body: unknown) => post(`/v1/admin/users/${user.id}/loyalty`, body), []);
  const self = me?.id === user.id;
  const label = user.fullName ?? user.phone ?? user.email ?? user.id;
  return (
    <li aria-label={label} className="rounded-[8px] border border-stone p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">{label}</span>
          <span className="block text-sm text-graphite tabular">
            {[user.phone, user.email].filter(Boolean).join(', ')}
            {user.phone && !user.phoneVerified && ' (not verified)'}
          </span>
        </p>
        <Pill tone={user.role === 'admin' ? 'bad' : user.role === 'staff' ? 'info' : 'neutral'}>
          {human(user.role)}
          {user.staffBranchId ? `, ${user.staffBranchId}` : ''}
        </Pill>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="flex flex-wrap items-end gap-2">
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={self}>
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
          {role === 'staff' && (
            <Select label="Store" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">Choose</option>
              {(branches.data?.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </Select>
          )}
          <Button
            variant="secondary"
            disabled={self}
            loading={saveRole.isPending}
            onClick={() => {
              if (role === 'staff' && !branch) return toast.error('Choose the store for this staff member.');
              saveRole.mutate({ role, staffBranchId: role === 'staff' ? branch : null }, { onSuccess: () => toast.success('Role saved'), onError: (e) => toast.error(errText(e)) });
            }}
          >
            Save role
          </Button>
          {self && <p className="w-full text-sm text-graphite">You can't change your own role.</p>}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Points to add or remove" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))} inputMode="numeric" className="w-36" />
          <Field label="Why" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="min-w-0 flex-1" />
          <Button
            variant="secondary"
            loading={points.isPending}
            onClick={() => {
              const d = Number(delta);
              if (!Number.isInteger(d) || d === 0) return toast.error('Enter a whole number of points, not zero.');
              if (!note.trim()) return toast.error('Write why the points change.');
              points.mutate({ delta: d, note: note.trim() }, { onSuccess: () => (toast.success('Points adjusted'), setDelta(''), setNote('')), onError: (e) => toast.error(errText(e)) });
            }}
          >
            Adjust points
          </Button>
        </div>
      </div>
    </li>
  );
}

export function QuestionsPage() {
  const [status, setStatus, page, setPage] = useParam('status', 'pending');
  const list = useAdminQuery<{ questions: AdminQuestion[]; total: number }>(['questions'], '/v1/admin/questions', { status: status || undefined, page });
  return (
    <AdminPage title="Questions">
      <Select label="Show" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
        <option value="pending">Waiting for an answer</option>
        <option value="published">Published</option>
        <option value="hidden">Hidden</option>
        <option value="">All</option>
      </Select>
      <QueryView query={list} skeleton={<Skeleton className="h-64 w-full" />} isEmpty={(d) => d.questions.length === 0} empty={<EmptyState title="Nothing here" body="New questions from product pages appear here." />}>
        {(d) => (
          <>
            <div className="flex flex-col gap-3">
              {d.questions.map((q) => (
                <QuestionCard key={q.id} q={q} />
              ))}
            </div>
            <Pager page={page} pageSize={25} total={d.total} onPage={setPage} />
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

function QuestionCard({ q }: { q: AdminQuestion }) {
  const toast = useToast();
  const [answer, setAnswer] = useState(q.answer ?? '');
  const save = useAdminMutation((body: unknown) => patch(`/v1/admin/questions/${q.id}`, body), [['questions'], ['overview']]);
  const id = `q-${q.id}`;
  const send = (body: Record<string, unknown>, done: string) => save.mutate(body, { onSuccess: () => toast.success(done), onError: (e) => toast.error(errText(e)) });
  return (
    <article aria-labelledby={id} className="rounded-[8px] border border-stone p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={id} className="font-semibold">
            {q.question}
          </h2>
          <p className="text-sm text-graphite">
            {q.authorName}
            {q.fromMember ? ' (member)' : ''}, {dateTime(q.createdAt)}, on{' '}
            <a href={`/p/${q.productSlug}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {q.productName}
            </a>
          </p>
        </div>
        <Pill tone={q.status === 'published' ? 'good' : q.status === 'hidden' ? 'neutral' : 'warn'}>{human(q.status)}</Pill>
      </div>
      <TextArea label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={2000} className="mt-3" hint="Shown on the product page under the question." />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          loading={save.isPending}
          onClick={() => {
            if (!answer.trim()) return toast.error('Write the answer first.');
            send({ answer: answer.trim(), status: 'published' }, 'Answer published');
          }}
        >
          Publish answer
        </Button>
        {q.status !== 'hidden' && (
          <Button variant="secondary" onClick={() => send({ status: 'hidden' }, 'Question hidden')}>
            Hide
          </Button>
        )}
      </div>
    </article>
  );
}

export function ReturnsPage() {
  const [status, setStatus, page, setPage] = useParam('status', '');
  const list = useAdminQuery<{ returns: AdminReturn[]; total: number; page: number; pageSize: number }>(['returns'], '/v1/admin/returns', { status: status || undefined, page });
  return (
    <AdminPage title="Returns">
      <Select label="Show" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
        <option value="">All</option>
        <option value="requested">To decide</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </Select>
      <QueryView query={list} skeleton={<Skeleton className="h-64 w-full" />} isEmpty={(d) => d.returns.length === 0} empty={<EmptyState title="No returns" />}>
        {(d) => (
          <>
            <div className="flex flex-col gap-3">
              {d.returns.map((r) => (
                <ReturnCard key={r.number} r={r} />
              ))}
            </div>
            <Pager page={d.page} pageSize={d.pageSize} total={d.total} onPage={setPage} />
          </>
        )}
      </QueryView>
    </AdminPage>
  );
}

function ReturnCard({ r }: { r: AdminReturn }) {
  const toast = useToast();
  const { user } = useAuth();
  const branches = useBranches();
  const [branch, setBranch] = useState(user?.staffBranchId ?? '');
  const [note, setNote] = useState('');
  const decide = useAdminMutation((body: unknown) => post(`/v1/admin/returns/${r.number}/decision`, body), [['returns'], ['overview']]);
  const id = `r-${r.number}`;
  const send = (decision: 'approve' | 'reject') => {
    const body: Record<string, unknown> = { decision };
    if (decision === 'approve' && branch && user?.role === 'admin') body.branchId = branch;
    if (note.trim()) body.note = note.trim();
    decide.mutate(body, { onSuccess: () => toast.success(decision === 'approve' ? 'Return approved' : 'Return rejected'), onError: (e) => toast.error(errText(e)) });
  };
  return (
    <article aria-labelledby={id} className="rounded-[8px] border border-stone p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={id} className="font-semibold">
            Return {r.number}
          </h2>
          <p className="text-sm text-graphite">
            Order{' '}
            <Link to={`/admin/orders/${r.orderNumber}`} className="underline underline-offset-2">
              {r.orderNumber}
            </Link>
            , {dateTime(r.createdAt)}
          </p>
        </div>
        <Pill tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'neutral' : 'warn'}>{human(r.status)}</Pill>
      </div>
      <ul className="mt-2 text-[15px]">
        {r.items.map((i) => (
          <li key={i.orderItemId}>
            {i.qty} × {i.name}, size {i.size}: {i.reason}
            {i.exchangeSize ? `, exchange for ${i.exchangeSize}` : ''}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-sm">
        {r.resolution === 'refund' ? `Refund of ${formatUsd(r.refundCents)}` : human(r.resolution)}
        {r.note && <span className="block text-graphite">Customer note: {r.note}</span>}
        {r.decisionNote && <span className="block text-graphite">Decision note: {r.decisionNote}</span>}
      </p>
      {r.status === 'requested' && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {user?.role === 'admin' && (
            <Select label="Restock at" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">Choose</option>
              {(branches.data?.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </Select>
          )}
          <Field label="Note to the customer" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-w-[200px] flex-1" />
          <Button variant="primary" loading={decide.isPending && (decide.variables as { decision?: string } | undefined)?.decision === 'approve'} onClick={() => send('approve')}>
            Approve
          </Button>
          <Button variant="secondary" onClick={() => send('reject')}>
            Reject
          </Button>
        </div>
      )}
    </article>
  );
}
