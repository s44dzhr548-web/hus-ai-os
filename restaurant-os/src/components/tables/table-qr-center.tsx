"use client";

import { Button, Modal } from "@/components/ui";
import { Download, Printer, QrCode, RefreshCw, Share2 } from "lucide-react";

interface TableQrCenterProps {
  open: boolean;
  onClose: () => void;
  branchId: string;
  selectedCount: number;
  canManage: boolean;
  onRegenerateAll: () => void;
  onRegenerateSelected: () => void;
  onPrintAll: () => void;
  onPrintSelected: () => void;
  onExportSelected: () => void;
  loading?: boolean;
}

export function TableQrCenter({
  open,
  onClose,
  selectedCount,
  canManage,
  onRegenerateAll,
  onRegenerateSelected,
  onPrintAll,
  onPrintSelected,
  onExportSelected,
  loading,
}: TableQrCenterProps) {
  return (
    <Modal open={open} onClose={onClose} title="مركز QR">
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          إدارة رموز QR للطاولات — تجديد، طباعة، وتصدير
        </p>
        {canManage && (
          <>
            <Button className="w-full" variant="outline" loading={loading} onClick={onRegenerateAll}>
              <RefreshCw className="h-4 w-4" />
              تجديد جميع QR
            </Button>
            {selectedCount > 0 && (
              <Button
                className="w-full"
                variant="outline"
                loading={loading}
                onClick={onRegenerateSelected}
              >
                <QrCode className="h-4 w-4" />
                تجديد المحدد ({selectedCount})
              </Button>
            )}
          </>
        )}
        <Button className="w-full" variant="outline" onClick={onPrintAll}>
          <Printer className="h-4 w-4" />
          طباعة PDF — جميع الطاولات
        </Button>
        {selectedCount > 0 && (
          <>
            <Button className="w-full" variant="outline" onClick={onPrintSelected}>
              <Printer className="h-4 w-4" />
              طباعة المحدد ({selectedCount})
            </Button>
            <Button className="w-full" variant="outline" onClick={onExportSelected}>
              <Download className="h-4 w-4" />
              تصدير المحدد
            </Button>
          </>
        )}
        <Button className="w-full" variant="outline" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
          <Share2 className="h-4 w-4" />
          نسخ رابط الصفحة
        </Button>
      </div>
    </Modal>
  );
}
