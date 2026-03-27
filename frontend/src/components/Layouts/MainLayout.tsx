import { Outlet } from "react-router";
import Sidebar from "../Sidebar/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 w-full ">
        <Outlet />
      </div>
    </div>
  );
}
