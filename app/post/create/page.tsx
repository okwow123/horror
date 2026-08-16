// [2026-08-16] 로그인 제거. 누구나 익명으로 글 작성 가능.

import { CreateForm } from './CreateForm';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default function CreatePostPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <CreateForm />
    </main>
  );
}
