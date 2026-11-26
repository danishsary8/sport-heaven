import { useState } from 'react';
import { isApiError } from '../../../lib/api';
import { Button, QueryView, Select, Skeleton } from '../../../ui';
import { SystemHealthDashboard } from '../health/SystemHealthDashboard';
import { AdminOnly } from '../AdminLayout';
import { post, useAdminMutation, useAdminQuery } from '../api';
import type { NotificationRow, WebhookRow } from '../types';
import { AdminPage, Pager, Pill, dateTime, human } from '../ui';

const tone = (s: string) => (s === 'sent' || s === 'processed' ? 'good' : s === 'failed' || s === 'rejected' ? 'bad' : s === 'pending' || s === 'received' ? 'info' : 'neutral');

export function HealthPage() {
  return (
    <AdminOnly>
      <div className="-mx-4 -mt-5 lg:-mx-8 lg:-mt-8">
        <SystemHealthDashboard />
      </div>
    </AdminOnly>
  );
}

export function LogsPage() {
  const [noteStatus, setNoteStatus] = useState('');
  const [notePage, setNotePage] = useState(1);
  const [hookStatus, setHookStatus] = useState('');
  const [hookPage, setHookPage] = useState(1);
  const notes = useAdminQuery<{ notifications: NotificationRow[]; total: number }>(['logs', 'notifications'], '/v1/admin/notifications', { status: noteStatus || undefined, page: notePage, pageSize: 25 });
  const hooks = useAdminQuery<{ events: WebhookRow[]; total: number }>(['logs', 'webhooks'], '/v1/admin/payments/webhooks', { status: hookStatus || undefined, page: hookPage, pageSize: 25 });
  const test = useAdminMutation((channel: 'telegram' | 'email') => post<{ sent: boolean; error?: string }>('/v1/admin/notifications/test', { channel }), [['logs']]);
  const result = test.data ? (test.data.sent ? 'Sent. Check the chat or inbox.' : `Not sent: ${test.data.error ?? 'unknown error'}`) : test.isError ? (isApiError(test.error) ? test.error.message : 'Something went wrong.') : null;

  return (
    <AdminOnly>
      <AdminPage title="Logs">
        <section aria-labelledby="test-h" className="rounded-[8px] border border-stone p-4">
          <h2 id="test-h" className="font-semibold">
            Test messages
          </h2>
          <p className="text-sm text-graphite">Checks that the shop can reach the staff Telegram chat and send email.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" loading={test.isPending && test.variables === 'telegram'} onClick={() => test.mutate('telegram')}>
              Send a test Telegram message
            </Button>
            <Button variant="secondary" loading={test.isPending && test.variables === 'email'} onClick={() => test.mutate('email')}>
              Send a test email
            </Button>
          </div>
          {result && (
            <p role="status" className="mt-2 font-medium">
              {result}
            </p>
          )}
        </section>

        <section aria-labelledby="notes-h" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="notes-h" className="text-lg font-semibold">
              Messages
            </h2>
            <Select label="Status" value={noteStatus} onChange={(e) => (setNoteStatus(e.target.value), setNotePage(1))}>
              <option value="">All</option>
              <option value="failed">Failed</option>
              <option value="pending">Waiting</option>
              <option value="sent">Sent</option>
              <option value="skipped">Skipped</option>
            </Select>
          </div>
          <QueryView query={notes} skeleton={<Skeleton className="h-40 w-full" />}>
            {(d) => (
              <>
                <ul className="divide-y divide-stone rounded-[8px] border border-stone text-[15px]">
                  {d.notifications.map((n) => (
                    <li key={n.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                      <span className="min-w-0">
                        <span className="font-semibold">{human(n.template)}</span> <span className="text-graphite">by {n.channel}</span>
                        <span className="block text-sm text-graphite">
                          {dateTime(n.createdAt)}, {n.attempts} {n.attempts === 1 ? 'try' : 'tries'}
                        </span>
                        {n.lastError && <span className="block text-sm text-vermilion">{n.lastError}</span>}
                      </span>
                      <Pill tone={tone(n.status)}>{human(n.status)}</Pill>
                    </li>
                  ))}
                  {d.notifications.length === 0 && <li className="p-3 text-graphite">No messages.</li>}
                </ul>
                <Pager page={notePage} pageSize={25} total={d.total} onPage={setNotePage} />
              </>
            )}
          </QueryView>
        </section>

        <section aria-labelledby="hooks-h" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="hooks-h" className="text-lg font-semibold">
              Payment callbacks
            </h2>
            <Select label="Status" value={hookStatus} onChange={(e) => (setHookStatus(e.target.value), setHookPage(1))}>
              <option value="">All</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="processed">Processed</option>
              <option value="ignored">Ignored</option>
              <option value="received">Received</option>
            </Select>
          </div>
          <QueryView query={hooks} skeleton={<Skeleton className="h-40 w-full" />}>
            {(d) => (
              <>
                <ul className="divide-y divide-stone rounded-[8px] border border-stone text-[15px]">
                  {d.events.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                      <span className="min-w-0">
                        <span className="font-semibold">{human(e.provider)}</span> <span className="font-mono text-sm">{e.tranId ?? e.eventId}</span>
                        <span className="block text-sm text-graphite">
                          {dateTime(e.receivedAt)}
                          {e.signatureValid ? '' : ', signature did not match'}
                        </span>
                        {e.error && <span className="block text-sm text-vermilion">{e.error}</span>}
                      </span>
                      <Pill tone={tone(e.processingStatus)}>{human(e.processingStatus)}</Pill>
                    </li>
                  ))}
                  {d.events.length === 0 && <li className="p-3 text-graphite">No callbacks yet.</li>}
                </ul>
                <Pager page={hookPage} pageSize={25} total={d.total} onPage={setHookPage} />
              </>
            )}
          </QueryView>
        </section>
      </AdminPage>
    </AdminOnly>
  );
}
