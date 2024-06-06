import Faq from "./components/sections/Faq";
import InvolvedParties from "./components/sections/InvolvedParties";
import FakeProgress from "./FakeProgress";

function App() {
  return (
    <div>
        <div className="bg-gray-100 min-h-screen w-full flex flex-col justify-between">
        <div className="flex flex-col justify-center items-center flex-grow">
            <div className="flex flex-col justify-center items-center gap-4 w-full px-4">
            <img
                src="/assets/images/tree.png"
                alt="Green Ecolution Logo"
                className="w-24 h-24 sm:w-32 sm:h-32"
            />
            <h1 className="text-5xl sm:text-7xl font-bold text-center">
                Green Ecolution
            </h1>
            <p className="text-lg sm:text-2xl font-semibold text-center">
                🚧 Page under construction, please wait...
            </p>
            </div>
        </div>
        <div className="w-full flex justify-center mb-10">
            <FakeProgress />
        </div>
        </div>
        <InvolvedParties />
        <Faq />
    </div>
  );
}

export default App;
