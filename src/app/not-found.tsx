import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg">
      <p className="eyebrow">Missing</p>
      <h1 className="mt-2 font-serif text-4xl">That page is not in the books.</h1>
      <Link href="/" className="btn-primary mt-6">
        Back to the overview
      </Link>
    </div>
  );
}
