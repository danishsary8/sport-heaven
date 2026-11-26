import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { apiFetch, isApiError } from '../../../lib/api';
import { formatDate, useI18n } from '../../../lib/i18n';
import { Button, ErrorState, Field, TextArea } from '../../../ui';
import { useQuestions } from '../api';

/** Published questions with the shop's answers, and a form to ask (questions appear once answered). */
export function QuestionsSection({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const questions = useQuestions(slug);
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [errors, setErrors] = useState<{ name?: string; question?: string }>({});
  const ask = useMutation({
    mutationFn: (body: { authorName: string; question: string }) => apiFetch(`/v1/catalog/products/${encodeURIComponent(slug)}/questions`, { method: 'POST', body }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      name: name.trim() ? undefined : t('qa.nameRequired'),
      question: question.trim().length >= 5 ? undefined : t('qa.questionShort'),
    };
    setErrors(next);
    if (next.name || next.question) return;
    ask.mutate({ authorName: name.trim(), question: question.trim() });
  };

  const list = questions.data?.questions ?? [];
  return (
    <section aria-labelledby="qa" className="mx-auto mt-14 max-w-[1320px] px-4 lg:px-8">
      <h2 id="qa" className="font-display text-3xl font-bold">
        {t('qa.title')}
      </h2>
      <div className="mt-5 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {questions.isError ? (
            <ErrorState onRetry={() => void questions.refetch()} />
          ) : list.length === 0 ? (
            <p className="text-graphite">{questions.isPending ? t('common.loading') : t('qa.none')}</p>
          ) : (
            <ul className="divide-y divide-stone">
              {list.map((q) => (
                <li key={q.id} className="py-4">
                  <p className="font-semibold">{q.question}</p>
                  <p className="text-sm text-graphite">{t('qa.askedBy', { name: q.authorName, date: formatDate(q.createdAt, lang) })}</p>
                  {q.answer && (
                    <p className="mt-2 border-l-2 border-cobalt pl-3 text-[15px]">
                      <span className="sr-only">{t('qa.answer')}: </span>
                      {q.answer}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          {ask.isSuccess ? (
            <p role="status" className="rounded-[8px] bg-stone p-4">
              {t('qa.thanks')}
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-3">
              <h3 className="font-semibold">{t('qa.ask')}</h3>
              <Field label={t('qa.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} error={errors.name} autoComplete="given-name" />
              <TextArea label={t('qa.question')} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} error={errors.question} hint={t('qa.hint')} />
              {ask.isError && <p role="alert" className="text-sm font-medium text-vermilion">{isApiError(ask.error) ? ask.error.message : t('common.error')}</p>}
              <Button type="submit" variant="primary" loading={ask.isPending} className="self-start">
                {t('qa.send')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
