import { useNavigate } from "react-router-dom";

export default function LandingPage() {
    const navigate = useNavigate();
    return (
        <div className="bg-[url('/isdlBG.jpg')] bg-cover h-screen font-mono relative ">
            <div className="flex flex-col justify-center gap-4 items-center h-screen backdrop-blur-sm backdrop-brightness-50">
                <h1 className="text-5xl font-extrabold text-center p-3">
                    AI Commentary Generating <br />
                    System for FIFA
                </h1>
                <button
                    className="border border-white rounded-md p-4 pt-2 pb-2 hover:bg-white hover:text-black transition-colors duration-300 ease-in-out"
                    onClick={() => {
                        navigate("/playground");
                    }}
                >
                    Get Started
                </button>
            </div>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-xl w-max">
                <div className="text-center text-4xl mb-4">Team 18</div>
                <div className="flex w-full justify-between gap-8">
                    <div>Anmol Uniyal</div>
                    <div>22UCS019</div>
                </div>
                <div className="flex w-full justify-between gap-8">
                    <div>Harshit Manchanda</div>
                    <div>22UCS087</div>
                </div>
                <div className="flex w-full justify-between gap-8">
                    <div>Rishabh Jain</div>
                    <div>22UCS165</div>
                </div>
                <div className="flex w-full justify-between gap-8">
                    <div>Rishabh Rathi</div>
                    <div>22UCS166</div>
                </div>
                <div className="flex w-full justify-between gap-8">
                    <div>Shreyas Shrivastava</div>
                    <div>22UCS205</div>
                </div>
                <div className="flex w-full justify-between gap-8 ">
                    <div>Suryansh Chauhan</div>
                    <div>22UCS214</div>
                </div>
            </div>
        </div>
    );
}
