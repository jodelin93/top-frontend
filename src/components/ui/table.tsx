import * as React from "react"

import { cn } from "@/lib/utils"

// Plain table primitives with the admin list styling
const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="overflow-x-auto">
    <table className={cn("w-full text-sm", className)} {...props} />
  </div>
)

const THead = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn("border-b bg-gray-50 text-left text-xs uppercase text-gray-500", className)}
    {...props}
  />
)

const TBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y", className)} {...props} />
)

const Th = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("px-4 py-3 font-medium", className)} {...props} />
)

const Td = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3", className)} {...props} />
)

// Full-width row for loading / empty messages
const EmptyRow = ({ colSpan, children }: { colSpan: number; children: React.ReactNode }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-400">
      {children}
    </td>
  </tr>
)

export { Table, THead, TBody, Th, Td, EmptyRow }
