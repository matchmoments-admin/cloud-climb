import Link from 'next/link';
import { QuestionForm } from '@/components/admin';

export const metadata = {
  title: 'New Question - Admin - Cloud Climb',
};

export default function NewQuestionPage() {
  return (
    <div>
      <div className="admin-page-header">
        <div>
          <nav className="admin-breadcrumb">
            <Link href="/admin/questions">Questions</Link>
            <span>/</span>
            <span>New</span>
          </nav>
          <h1 className="admin-page-title">Create Question</h1>
        </div>
      </div>

      <QuestionForm mode="create" />
    </div>
  );
}
