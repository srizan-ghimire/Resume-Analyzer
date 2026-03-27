import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { useState } from "react";

interface RecommendationJobCardProps {
  job: any;
  isLoadingFeaturedJobs: boolean;
}

const RecommendationJobCard = ({
  job,
  isLoadingFeaturedJobs,
}: RecommendationJobCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoadingFeaturedJobs) {
    return <div>Loading...</div>;
  }

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <div
        className="bg-white rounded-lg border shadow-sm overflow-hidden cursor-pointer 
        hover:shadow-lg transition transform hover:-translate-y-1 p-5"
        onClick={openModal}
      >
        {/* Job Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {job["Job Title"]}
            </h3>
            <div className="text-sm text-gray-600">
              {job["Company"]} • {job["location"]}
            </div>
          </div>
          {/* Salary Info */}
          <div className="text-lg font-medium text-blue-600">
            {job["Salary Range"] || "Not disclosed"}
          </div>
        </div>

        {/* Job Details */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="bg-blue-100 text-blue-600 px-3 py-1 rounded-md text-xs">
            {job["Work Type"]}
          </Badge>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-300  flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-1/2">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {job["Job Title"]}
                </h3>
                <div className="text-sm text-gray-600">
                  {job["Company"]} • {job["location"]}
                </div>
              </div>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={closeModal}
              >
                X
              </button>
            </div>
            <div className="mt-4 text-gray-700">
              <p>
                <strong>Salary:</strong>{" "}
                {job["Salary Range"] || "Not disclosed"}
              </p>
              <p>
                <strong>Job Type:</strong> {job["Work Type"]}
              </p>
              <p>
                <strong>Job Description:</strong>{" "}
                {job["Job Description"] || "No description available"}
              </p>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => {
                  // Implement Apply Button Logic
                  console.log("Applied for the job!");
                  closeModal();
                }}
                className="bg-blue-600 text-white py-2 px-4 rounded-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationJobCard;
