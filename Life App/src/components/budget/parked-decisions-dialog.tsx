"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { MomentLog } from "@/types";

interface ParkedDecisionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: MomentLog[];
  onRefresh: () => void;
}

export function ParkedDecisionsDialog({
  open,
  onOpenChange,
  logs,
  onRefresh,
}: ParkedDecisionsDialogProps) {
  async function resolve(id: number, decision: "proceeded" | "declined") {
    const res = await fetch(`/api/moment-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) onRefresh();
  }

  async function remove(id: number) {
    const res = await fetch(`/api/moment-logs/${id}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)]">
            Parked purchases
          </DialogTitle>
        </DialogHeader>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No parked decisions.
          </p>
        ) : (
          <div className="space-y-3 py-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-border/60 px-4 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{log.description}</p>
                    <p className="text-xs text-muted-foreground">
                      €{log.amount.toFixed(2)} · {formatDate(log.date)}
                      {log.categoryName ? ` · ${log.categoryName}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    Parked
                  </Badge>
                </div>

                {(log.scorecardAnswer || log.utilityStatusAnswer || log.sixMonthAnswer) && (
                  <div className="space-y-1.5 border-t pt-2 mt-1">
                    {log.scorecardAnswer && (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Inner Scorecard</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{log.scorecardAnswer}</p>
                      </div>
                    )}
                    {log.utilityStatusAnswer && (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Utility vs. Status</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{log.utilityStatusAnswer}</p>
                      </div>
                    )}
                    {log.sixMonthAnswer && (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">In Six Months</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{log.sixMonthAnswer}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => resolve(log.id, "proceeded")}
                  >
                    Proceeded
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => resolve(log.id, "declined")}
                  >
                    Declined
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive ml-auto"
                    onClick={() => remove(log.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
