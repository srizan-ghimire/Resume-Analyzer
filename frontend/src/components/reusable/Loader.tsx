import loader from "../../assets/club-owner_loader 1.gif";

const Loader = () => {
  return (
    <div className="absolute inset-0 z-10  flex justify-center items-center h-full bg-[rgba(0,0,0,0.5)]">
      <img src={loader} alt="loader" />
    </div>
  );
};

export default Loader;
