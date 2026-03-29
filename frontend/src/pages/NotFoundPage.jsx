import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';

export default function NotFoundPage() {
  return (
    <Layout>
      <div className="panel text-center">
        <h1 className="text-3xl font-semibold">404</h1>
        <p className="mt-2 text-slate-300">Page not found.</p>
        <Link className="btn-primary mt-4 inline-flex" to="/">Go Home</Link>
      </div>
    </Layout>
  );
}
