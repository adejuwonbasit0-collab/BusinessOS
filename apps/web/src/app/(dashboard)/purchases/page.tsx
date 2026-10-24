import { redirect } from 'next/navigation';

// Purchasing is part of the real inventory workflow: create a product,
// select its supplier, issue a PO, then receive it into a warehouse. Keeping a
// second page with sample orders made the two workflows contradict each other.
export default function PurchasesPage() {
  redirect('/inventory');
}
