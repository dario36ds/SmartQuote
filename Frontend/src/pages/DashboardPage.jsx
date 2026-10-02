import AuthenticatedLayout from "../components/AuthenticatedLayout";

export default function DashboardPage() {
  return (
    <AuthenticatedLayout>
      <h2>Dashboard</h2>

      <p>
        Da qui gestirai clienti e preventivi.
      </p>
    </AuthenticatedLayout>
  );
}
