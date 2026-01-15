import { Outlet } from "react-router-dom";
import { ClientHeader } from "./ClientHeader";

export function ClientLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ClientHeader />
      <main className="flex-1 container mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
