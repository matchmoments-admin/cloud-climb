import Link from 'next/link';
import { ArticleForm } from '@/components/admin';

export const metadata = {
  title: 'New Post - Admin - Cloud Climb',
};

export default function NewPostPage() {
  return (
    <div>
      <div className="admin-page-header">
        <div>
          <nav className="admin-breadcrumb">
            <Link href="/admin/posts">Posts</Link>
            <span>/</span>
            <span>New</span>
          </nav>
          <h1 className="admin-page-title">Create New Post</h1>
        </div>
      </div>

      <ArticleForm mode="create" />
    </div>
  );
}
