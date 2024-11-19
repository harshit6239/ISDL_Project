import { useState, useEffect, useRef } from "react";
import CustomSelect from "./components/CustomSelect";
import StreamingMessage from "./components/StreamingMessage";
import TeamStats from "./components/TeamStats";
import { io } from "socket.io-client";

const Playground = () => {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechEnabled] = useState(true);
    const messagesEndRef = useRef(null);
    const speechSynthesis = window.speechSynthesis;
    const currentUtterance = useRef(null);
    const speechQueue = useRef([]);
    const messageQueue = useRef([]);
    const isProcessingQueue = useRef(false);

    const [formData, setFormData] = useState({
        eventType: "None",
        majorPlayer1: "",
        majorPlayer2: "",
        tackleType: "",
        cardType: "",
        cardGivenTo: "",
        injured: "",
        location: "",
        result: "",
    });

    const [team1Stats] = useState({
        goals: 0,
        redCards: 0,
        yellowCards: 0,
    });
    const [team2Stats] = useState({
        goals: 0,
        redCards: 0,
        yellowCards: 0,
    });

    // Dropdown options grouped by event type
    const baseOptions = {
        eventType: [
            "None",
            "Goal",
            "Tackle",
            "Card",
            "Injury",
            "Shot",
            "Pass",
            "Save",
        ],
        majorPlayer1: [
            "None",
            "Vinicius Jr",
            "Bellingham",
            "Kroos",
            "Modric",
            "Rodrygo",
        ],
        majorPlayer2: [
            "None",
            "Lewandowski",
            "Gavi",
            "Pedri",
            "De Jong",
            "Yamal",
        ],
        tackleType: [
            "None",
            "Slide",
            "Standing",
            "Shoulder-to-shoulder",
            "Late",
        ],
        cardType: ["None", "Yellow", "Red"],
        cardGivenTo: ["None", "Home Team Player", "Away Team Player"],
        injured: ["None", "Yes", "No"],
        location: ["None", "Penalty Box", "Midfield", "Wing", "Center Circle"],
        result: [
            "None",
            "Success",
            "Failure",
            "Out of bounds",
            "Foul",
            "Goal",
            "Save",
            "Corner",
        ],
    };

    // Define which fields should be shown based on event type
    const eventTypeFields = {
        None: ["eventType"],
        Goal: [
            "eventType",
            "majorPlayer1",
            "majorPlayer2",
            "location",
            "result",
        ],
        Tackle: [
            "eventType",
            "majorPlayer1",
            "majorPlayer2",
            "tackleType",
            "location",
            "result",
            "injured",
        ],
        Card: [
            "eventType",
            "majorPlayer1",
            "cardType",
            "cardGivenTo",
            "location",
        ],
        Injury: ["eventType", "majorPlayer1", "injured", "location"],
        Shot: ["eventType", "majorPlayer1", "location", "result"],
        Pass: [
            "eventType",
            "majorPlayer1",
            "majorPlayer2",
            "location",
            "result",
        ],
        Save: ["eventType", "majorPlayer1", "location", "result"],
    };

    const getRelevantFields = () => {
        return eventTypeFields[formData.eventType || "None"] || ["eventType"];
    };

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io("http://localhost:5000");

        newSocket.on("connect", () => {
            console.log("Connected to WebSocket server");
        });

        newSocket.on("disconnect", () => {
            setIsLoading(false);
            console.log("Disconnected from WebSocket server");
        });

        newSocket.on("error", (error) => {
            console.error("Socket error:", error);
            setIsLoading(false);
        });

        newSocket.on("llm_response", (data) => {
            console.log("Received response:", data);
            if (data.chunk.trim() == "") {
                if (data.done) {
                    setIsLoading(false);
                }
                return;
            }
            addToSpeechQueue(data.chunk, data.commentator);

            addToMessageQueue(data.chunk, data.commentator);

            if (messageQueue.current.length == 1) {
                processMessageQueue();
            }

            if (data.done) {
                setIsLoading(false);
            }
        });

        setSocket(newSocket);

        return () => {
            if (currentUtterance.current) {
                speechSynthesis.cancel();
            }
            speechQueue.current = [];
            newSocket.close();
        };
    }, [speechEnabled]);

    // Process speech queue
    const processSpeechQueue = async () => {
        if (
            isProcessingQueue.current ||
            speechQueue.current.length === 0 ||
            !speechEnabled
        ) {
            return;
        }

        isProcessingQueue.current = true;

        while (speechQueue.current.length > 0 && speechEnabled) {
            const text = speechQueue.current[0].text;
            const commentator = speechQueue.current[0].commentator;

            try {
                await speakText(text, commentator);
                // Remove the spoken text from the queue
                speechQueue.current.shift();
            } catch (error) {
                console.error("Speech error:", error);
                // Clear the queue on error
                speechQueue.current = [];
                messageQueue.current = [];
                break;
            }
        }

        isProcessingQueue.current = false;
    };

    const processMessageQueue = () => {
        if (messageQueue.current.length === 0) {
            return;
        }

        const message = messageQueue.current[0];
        setMessages((prevMessages) => {
            return [
                ...prevMessages,
                {
                    text: message.text,
                    role: message.commentator,
                },
            ];
        });
    };

    // Add text to speech queue
    const addToSpeechQueue = (text, commentator) => {
        // console.log("Adding to speech queue:", text);
        if (!text.trim() || !speechEnabled) return;

        speechQueue.current.push({ text, commentator });
        processSpeechQueue();
    };

    const addToMessageQueue = (text, commentator) => {
        if (!text.trim()) return;
        messageQueue.current.push({ text, commentator });
    };

    // Speak text and return a promise
    const speakText = (text, commentator) => {
        return new Promise((resolve, reject) => {
            if (!text.trim()) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            currentUtterance.current = utterance;

            // Set voice properties
            const voices = speechSynthesis.getVoices();
            const selectedVoice = voices[commentator - 1] || voices[0];
            utterance.voice = selectedVoice;
            utterance.pitch = 2; // You can adjust the pitch
            utterance.rate = 1.5; // You can adjust the rate

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
                currentUtterance.current = null;
                messageQueue.current.shift();
                processMessageQueue();

                resolve();
            };
            utterance.onerror = (error) => {
                console.error("Speech synthesis error:", error);
                setIsSpeaking(false);
                currentUtterance.current = null;
                reject(error);
            };

            speechSynthesis.speak(utterance);
        });
    };

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Cleanup speech synthesis on unmount
    useEffect(() => {
        return () => {
            if (currentUtterance.current) {
                speechSynthesis.cancel();
            }
            speechQueue.current = [];
            isProcessingQueue.current = false;
        };
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const newData = {
                ...prev,
                [name]: value,
            };

            // Reset irrelevant fields when event type changes
            if (name === "eventType") {
                const relevantFields = eventTypeFields[value];
                Object.keys(newData).forEach((key) => {
                    if (!relevantFields.includes(key)) {
                        newData[key] = "None";
                    }
                });
            }

            return newData;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSpeaking || !socket || isLoading || formData.eventType === "None")
            return;

        speechQueue.current = [];
        if (currentUtterance.current) {
            speechSynthesis.cancel();
        }

        const formattedMessage = JSON.stringify(formData);

        setMessages((prev) => [
            ...prev,
            {
                text: formattedMessage,
                role: "user",
            },
        ]);

        socket.emit(
            "llm_request",
            JSON.stringify({ prompt: formattedMessage })
        );
        setIsLoading(true);

        // Reset form to None values
        setFormData({
            eventType: "None",
            majorPlayer1: "None",
            majorPlayer2: "None",
            tackleType: "None",
            cardType: "None",
            cardGivenTo: "None",
            injured: "None",
            location: "None",
            result: "None",
        });
    };

    const queueStatus = `Queue length: ${speechQueue.current.length}`;

    return (
        <div className="bg-[url('/isdlBG.jpg')] bg-cover h-screen w-screen ">
            <div className="font-mono flex items-center justify-center w-screen h-screen pt-5 pb-5 backdrop-blur-sm backdrop-brightness-50 overflow-y-scroll">
                <TeamStats
                    team="RealMadrid"
                    goals={team1Stats.goals}
                    redCards={team1Stats.redCards}
                    yellowCards={team1Stats.yellowCards}
                />

                <div className="w-3/5 flex flex-col h-full">
                    {/* Chat container - same as before */}
                    <div className="mb-4 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {queueStatus}
                        </div>
                        <div>
                            {socket && socket.connected ? (
                                <span className="text-green-500">
                                    Connected
                                </span>
                            ) : (
                                <span className="text-red-500">
                                    Disconnected
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow mb-4 overflow-hidden rounded-lg min-h-[80%] bg-[#0e181c] border border-gray-700 shadow">
                        <div className="h-full overflow-y-auto p-4">
                            <div className="space-y-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${
                                            message.role === "user"
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={
                                                "max-w-[80%] rounded-lg p-3 " +
                                                (message.role === "user"
                                                    ? "bg-blue-500 text-white"
                                                    : message.role == "1"
                                                    ? "bg-green-500 text-white"
                                                    : "bg-red-500 text-white")
                                            }
                                        >
                                            {message.role === "user" ? (
                                                message.text
                                            ) : (
                                                <StreamingMessage
                                                    text={message.text}
                                                    role={message.role}
                                                    speed={50}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 rounded-lg p-3">
                                            <svg
                                                className="animate-spin h-6 w-6 text-gray-500"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    </div>

                    {/* Improved form layout */}
                    <form
                        onSubmit={handleSubmit}
                        className="bg-[#0e181c] p-4 rounded-lg border border-gray-700 "
                    >
                        <div className="space-y-4">
                            {/* Event Type Selection */}
                            <div className="mb-4">
                                <h3 className="text-white font-bold mb-2 text-lg">
                                    Select Event Type
                                </h3>
                                <CustomSelect
                                    getRelevantFields={getRelevantFields}
                                    name="eventType"
                                    options={baseOptions.eventType}
                                    value={formData.eventType}
                                    onChange={handleInputChange}
                                    label="Event Type"
                                />
                            </div>

                            {formData.eventType !== "None" && (
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Player Selection */}
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="majorPlayer1"
                                        options={baseOptions.majorPlayer1}
                                        value={formData.majorPlayer1}
                                        onChange={handleInputChange}
                                        label="Real Madrid Player"
                                    />
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="majorPlayer2"
                                        options={baseOptions.majorPlayer2}
                                        value={formData.majorPlayer2}
                                        onChange={handleInputChange}
                                        label="Barcelona Player"
                                    />

                                    {/* Event Details */}
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="location"
                                        options={baseOptions.location}
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        label="Location"
                                    />
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="result"
                                        options={baseOptions.result}
                                        value={formData.result}
                                        onChange={handleInputChange}
                                        label="Result"
                                    />

                                    {/* Conditional Fields */}
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="tackleType"
                                        options={baseOptions.tackleType}
                                        value={formData.tackleType}
                                        onChange={handleInputChange}
                                        label="Tackle Type"
                                    />
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="cardType"
                                        options={baseOptions.cardType}
                                        value={formData.cardType}
                                        onChange={handleInputChange}
                                        label="Card Type"
                                    />
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="cardGivenTo"
                                        options={baseOptions.cardGivenTo}
                                        value={formData.cardGivenTo}
                                        onChange={handleInputChange}
                                        label="Card Given To"
                                    />
                                    <CustomSelect
                                        getRelevantFields={getRelevantFields}
                                        name="injured"
                                        options={baseOptions.injured}
                                        value={formData.injured}
                                        onChange={handleInputChange}
                                        label="Injury Status"
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={
                                isLoading ||
                                isSpeaking ||
                                formData.eventType === "None"
                            }
                            className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg 
                                     hover:bg-blue-600 focus:outline-none focus:ring-2 
                                     focus:ring-blue-500 focus:ring-offset-2 
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-colors duration-200"
                        >
                            Submit Event
                        </button>
                    </form>
                </div>

                <TeamStats
                    team="FCBarcelona"
                    goals={team2Stats.goals}
                    redCards={team2Stats.redCards}
                    yellowCards={team2Stats.yellowCards}
                />
            </div>
        </div>
    );
};

export default Playground;
