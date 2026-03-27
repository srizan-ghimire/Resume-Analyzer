import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";

export default function JobCard({ job }) {
  const navigate = useNavigate();

  // Format expiry date
  const formattedExpiryDate = new Date(job.expiry_time).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div
      className="bg-white rounded-lg border shadow-sm overflow-hidden cursor-pointer 
      hover:shadow-lg transition transform hover:-translate-y-1 p-5"
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      {/* Job Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {job.job_title}
          </h3>
          <div className="text-sm text-gray-600">
            {job.company_name} • {job.location}
          </div>
        </div>
        {/* Salary Info */}
        <div className="text-lg font-medium text-blue-600">
          NPR {Number(job.salary).toLocaleString()}
        </div>
      </div>

      {/* Job Details */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="bg-blue-100 text-blue-600 px-3 py-1 rounded-md text-xs">
          {job.job_type === "FT" ? "Full-Time" : "Internship"}
        </Badge>
      </div>

      {/* Expiry Date */}
      <div className="mt-4 text-xs text-gray-500">
        Expires on: {formattedExpiryDate}
      </div>
    </div>
  );
}
