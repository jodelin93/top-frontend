---
id: faq-dates
title: Why is a date rejected?
category: FAQ
order: 1607
routes: []
keywords: [date rejected, invalid date, date in the past, date in the future, end date, period, from to, date range, validity, due date, date of birth]
related: [expenses-create, purchasing-invoices, price-lists, discounts-admin, estimates]
---
To prevent typing mistakes, the app checks dates. Often, the calendar does not even offer the dates that are not allowed.

| Where | Rule | Message |
| --- | --- | --- |
| Expense: **Date** | Not in the future | "The expense date cannot be in the future" |
| Supplier invoice: **Invoice date** | Not in the future | "The invoice date cannot be in the future" |
| Supplier invoice: **Due date** | Not before the invoice date | "The due date cannot be before the invoice date." |
| Supplier payment or credit | Not in the future | "The date cannot be in the future" |
| Purchase order: **Expected delivery** | Not in the past | "The expected delivery date cannot be in the past" |
| Customer: date of birth | Not in the future, not before 1900 | "The date cannot be before 1900" |
| Discount, price list: end of validity | After the start and not in the past | "Must be after the start date", "The end date cannot be in the past" |
| Estimate: **Valid until** | Not in the past | "The valid-until date cannot be in the past" |
| Settings: **Takes effect** | In the future, or empty | "Choose a time in the future, or leave empty" |
| Employee: hire date | At most one year ahead | "The hire date cannot be more than a year ahead" |
| Employee: last day | Not in the future, not before hire | "The termination date is before the hire date" |
| Attendance: entered times | Not in the future, clock-out after clock-in, 24 h maximum | "The time cannot be in the future"… |
| Periods (reports, sales, shifts, statements) | Start ≤ end | The end cannot be before the start |

> **Tip:** a date already saved that is now in the past (for example the end of an old estimate) can be kept as is; the rule applies when you enter or change the date.
