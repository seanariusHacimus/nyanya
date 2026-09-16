"use client";

import { useState } from "react";
import type { AdminDocumentRow, Page } from "@/lib/queries/admin";
import { stepByKey } from "@/content/verification-steps";
import { reviewDocument } from "@/lib/actions/admin";
import { RejectionForm } from "@/components/admin/rejection-form";
import {
  AdminError,
  actionButton,
  dangerButton,
  formatDate,
} from "@/components/admin/admin-ui";
import { Pager, rangeText } from "@/components/admin/pager";
import { useAdminAction } from "@/components/admin/use-admin-action";

/** Очередь документов: страница из 50, самые давние первыми. */
export function AdminDocumentQueue({ result }: { result: Page<AdminDocumentRow> }) {
  const { run, pending, busyId, error } = useAdminAction();
  const [rejecting, setRejecting] = useState<string | null>(null);

  const shown = rangeText(result.page, result.pageSize, result.rows.length, result.total);

  return (
    <div>
      <h1 className="font-display text-3xl leading-[1.08] font-medium text-ink sm:text-4xl">
        Документы на проверке
      </h1>

      <AdminError error={error} />

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-medium text-ink">
            Проверка документов
          </h2>
          <p className="text-sm text-ink-soft">
            В очереди: {result.total}
            {shown ? ` · ${shown}` : ""}
          </p>
        </div>

        {result.rows.length === 0 ? (
          <p className="mt-8 border border-line bg-paper px-5 py-8 text-sm text-ink-soft">
            {result.total === 0
              ? "Очередь пуста — новые документы появятся здесь сразу после загрузки."
              : "На этой странице пусто — вернитесь к началу очереди."}
          </p>
        ) : (
          <ul className="mt-8 grid gap-3">
            {result.rows.map((doc) => {
              const isRejecting = rejecting === doc.id;
              const busy = busyId === doc.id || pending;
              return (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-line bg-paper px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{doc.specialistName}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {stepByKey.get(doc.type as never)?.title ?? doc.type} ·{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/documents/${doc.fileKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={actionButton}
                    >
                      Открыть файл
                    </a>
                    {isRejecting ? (
                      <RejectionForm
                        placeholder="Что не так с документом"
                        submitLabel="Отклонить"
                        disabled={busy}
                        onCancel={() => setRejecting(null)}
                        onSubmit={(note) =>
                          run(
                            doc.id,
                            () =>
                              reviewDocument({
                                documentId: doc.id,
                                decision: "reject",
                                note,
                              }),
                            "Документ отклонён, специалист уведомлён",
                            () => setRejecting(null)
                          )
                        }
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(
                              doc.id,
                              () =>
                                reviewDocument({
                                  documentId: doc.id,
                                  decision: "approve",
                                }),
                              "Документ принят"
                            )
                          }
                          className={actionButton}
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setRejecting(doc.id)}
                          className={dangerButton}
                        >
                          Отклонить
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Pager
          pathname="/admin/documents"
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
        />
      </section>
    </div>
  );
}
