import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found / Page introuvable</h1>
      <Link href="/dashboard" className="button button-primary section-gap">
        Overview / Vue d’ensemble
      </Link>
    </div>
  );
}
