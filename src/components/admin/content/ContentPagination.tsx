import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

interface ContentPaginationProps {
  page: number;
  pageNumbers: number[];
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (p: number) => void;
  start: number;
  end: number;
  total: number;
  /** Ex.: ["filme", "filmes"] */
  noun: [string, string];
}

/** Paginação numérica padronizada das listas de conteúdo do admin. */
export const ContentPagination = ({
  page, pageNumbers, hasPrev, hasNext, onPrev, onNext, onGoTo, start, end, total, noun,
}: ContentPaginationProps) => (
  <div className="mt-4">
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={hasPrev ? onPrev : undefined}
            className={!hasPrev ? "pointer-events-none opacity-40" : "cursor-pointer"}
          />
        </PaginationItem>
        {pageNumbers.map((p, i) =>
          p === -1 ? (
            <PaginationItem key={`e-${i}`}>
              <span className="flex h-9 w-9 items-center justify-center text-[10px] text-muted-foreground">…</span>
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href="#" isActive={p === page} onClick={() => onGoTo(p)}>{p}</PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={hasNext ? onNext : undefined}
            className={!hasNext ? "pointer-events-none opacity-40" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
    <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
      {total === 0 ? 0 : start + 1}–{end} de {total} {total === 1 ? noun[0] : noun[1]}
    </p>
  </div>
);
