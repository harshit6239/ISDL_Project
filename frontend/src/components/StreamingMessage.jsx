import { useEffect, useState } from "react";
import PropTypes from "prop-types";

const StreamingMessage = ({ text, role, speed = 50 }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Reset state when text changes
        setDisplayedText("");
        setIsComplete(false);

        let currentIndex = 0;
        let mounted = true;

        const streamText = () => {
            if (!mounted) return;

            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex));
                currentIndex++;

                if (currentIndex <= text.length) {
                    setTimeout(streamText, speed);
                } else {
                    setIsComplete(true);
                }
            }
        };

        streamText();

        return () => {
            mounted = false;
        };
    }, [text, speed]);

    return (
        <div
            className={`max-w-[100%] rounded-lg p-3 ${
                role === 1 ? "bg-green-500" : "bg-red-500"
            } text-white`}
        >
            {displayedText}
            {!isComplete && <span className="animate-pulse">▋</span>}
        </div>
    );
};

StreamingMessage.propTypes = {
    text: PropTypes.string.isRequired,
    role: PropTypes.number.isRequired,
    speed: PropTypes.number,
};

export default StreamingMessage;
