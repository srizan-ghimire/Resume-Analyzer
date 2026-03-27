import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "../../context/authContext";

export default function AppliedJobsPage() {
  const { username, password } = useAuth();

  const {
    data: appliedJobs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["appliedJobs"],
    queryFn: async () => {
      const response = await axios.get("http://127.0.0.1:8000/applied_jobs/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${username}:${password}`),
        },
      });
      console.log("Applied Jobs Data:", response.data); // Debugging
      return response.data.applied_jobs;
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Error fetching jobs.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Applied Jobs</h1>

      {appliedJobs.length > 0 ? (
        <div className="space-y-4">
          {appliedJobs.map((job, index) => (
            <div
              key={index}
              className="border border-gray-300 p-6 rounded-lg shadow-lg hover:shadow-xl transition"
            >
              <h2 className="text-lg font-semibold text-teal-700">
                {job.job_title}
              </h2>
              <p className="text-gray-700 font-medium">{job.job_company}</p>
              <p className="text-gray-600">{job.location}</p>
              <p className="text-lg font-medium text-blue-600">{`Salary: NPR ${job.salary}`}</p>

              <div className="mt-2">
                <p className="text-gray-600 font-semibold">Job Requirements:</p>
                <ul className="list-disc pl-5 text-gray-500">
                  {job.job_requirements.split("\r\n").map((requirement, i) => (
                    <li key={i}>{requirement}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p
                  className={`font-semibold ${
                    job.status.toLowerCase() === "in review"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {job.status}
                </p>
                <p className="text-gray-500 text-sm">
                  {new Date(job.posted_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center">No jobs applied yet.</p>
      )}
    </div>
  );
}
