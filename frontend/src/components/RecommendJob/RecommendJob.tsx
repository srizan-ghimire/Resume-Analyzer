import { toast } from "react-toastify";
import Button from "../../design/Button";
import { useAuth } from "../../context/authContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import Loader from "../reusable/Loader";
import { Link } from "react-router-dom";

const RecommendJob = () => {
  const { files, username, password } = useAuth();
  interface Job {
    "Job Id": string;
    "Job Title": string;
    Company: string;
    location: string;
    "Salary Range": string;
    "Job Description": string;
    "Work Type": string;
    Experience: string;
    Similarity: number;
  }

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const {
    data: recommendationsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["jobRecommendations"],
    queryFn: async () => {
      const response = await axios.get(
        `http://127.0.0.1:8000/recommend/${username}/`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + btoa(`${username}:${password}`),
          },
        }
      );
      return response.data.recommendations;
    },
    enabled: files.length === 1,
    refetchOnWindowFocus: false,
  });

  console.log(files.length === 1);

  const { mutate: applyJob } = useMutation({
    mutationFn: async (data: unknown) => {
      const response = await axios.post(
        `http://127.0.0.1:8000/applyfeaturedjob/`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + btoa(`${username}:${password}`),
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setSelectedJob(null);
      toast.success("Application sent successfully! Best of luck.");
    },
    onError: () =>
      toast.error("Oops! Something went wrong while applying for the job."),
  });

  const otherJobs = recommendationsData?.filter(
    (job) => job["Similarity"] <= 0.3 && job["Similarity"] > 0
  );
  if (isLoading) return <Loader />;

  return (
    <div className="flex flex-col items-center gap-8 p-8 bg-gray-50 min-h-screen">
      <div className="p-8 w-full max-w-5xl bg-white rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          Discover Jobs Tailored Just for You!
        </h1>
        {files?.length < 1 && (
          <p className="text-gray-600">
            Get personalized job suggestions by uploading your resume. Ensure
            your{" "}
            <Link to="/profile" className="text-gray-300">
              Profile
            </Link>{" "}
            is complete to receive the best recommendations!
          </p>
        )}
        {recommendationsData?.length == 0 &&
          recommendationsData[0] === "Empty" && (
            <p className="text-gray-600">
              We couldn't find any recommendations. Please make sure your resume
              is well-detailed and contains the necessary information.
            </p>
          )}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {recommendationsData?.map((job) => {
            if (job["Similarity"] > 0.3)
              return (
                <button
                  key={job["Job Id"]}
                  onClick={() => setSelectedJob(job)}
                  className="p-6 bg-white shadow-md rounded-lg hover:shadow-xl transition border border-gray-300 cursor-pointer transform hover:scale-105"
                >
                  <h2 className="text-xl font-semibold text-gray-700">
                    {job["Job Title"]}
                  </h2>
                  <p className="text-gray-700">{job["Company"]}</p>
                  <p className="text-gray-600">{job["location"]}</p>
                  <p className="text-gray-800 font-semibold">
                    {job["Salary Range"]}
                  </p>
                </button>
              );
          })}
        </div>
        {otherJobs?.length > 0 && (
          <>
            <h2 className="text-3xl font-bold text-gray-800 mt-10 mb-6">
              You Might Also Like:
            </h2>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {otherJobs?.map((job: any) => {
                return (
                  <button
                    key={job["Job Id"]}
                    onClick={() => setSelectedJob(job)}
                    className="p-6 bg-white shadow-md rounded-lg hover:shadow-xl transition border border-gray-300 cursor-pointer transform hover:scale-105"
                  >
                    <h2 className="text-xl font-semibold text-gray-700">
                      {job["Job Title"]}
                    </h2>
                    <p className="text-gray-700">{job["Company"]}</p>
                    <p className="text-gray-600">{job["location"]}</p>
                    <p className="text-gray-800 font-semibold">
                      {job["Salary Range"]}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedJob && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-md bg-black/20 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
            >
              ✖
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {selectedJob["Job Title"]}
            </h2>
            <p className="text-gray-700 font-semibold">
              {selectedJob["Company"]}
            </p>
            <p className="text-gray-600">{selectedJob["location"]}</p>
            <p className="text-gray-800 font-semibold">
              {selectedJob["Salary Range"]}
            </p>
            <p className="text-gray-700 mt-2">
              {selectedJob["Job Description"]}
            </p>
            <Button
              className="mt-4 bg-gray-600 text-white px-6 py-3 rounded-md w-full hover:bg-gray-700 transition cursor-pointer"
              onClick={() =>
                applyJob({
                  job_title: selectedJob["Job Title"],
                  job_description: selectedJob["Job Description"],
                  company_name: selectedJob["Company"],
                  work_type: selectedJob["Work Type"],
                  job_requirements: selectedJob["Experience"],
                  location: selectedJob["location"],
                  salary:
                    Number(selectedJob["Salary Range"].match(/\d+/g)?.[0]) *
                    1000,
                })
              }
            >
              Apply Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendJob;
