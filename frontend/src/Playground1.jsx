import { useState, useEffect, useRef } from "react";
import StreamingMessage from "./components/StreamingMessages";
import TeamStats from "./components/TeamStats";
import { io } from "socket.io-client";

const Playground = () => {
    const [socket, setSocket] = useState(null);
    const [prompt, setPrompt] = useState("");
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

    const [team1Stats, setTeam1Stats] = useState({
        goals: 0,
        redCards: 0,
        yellowCards: 0,
    });
    const [team2Stats, setTeam2Stats] = useState({
        goals: 0,
        redCards: 0,
        yellowCards: 0,
    });

    useEffect(() => {
        console.log(messageQueue.current);
    }, [messageQueue.current]);

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

            // setMessages((prevMessages) => {
            //     return [
            //         ...prevMessages,
            //         {
            //             text: data.chunk,
            //             role: data.commentator,
            //         },
            //     ];
            // });

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

    const handleSubmit = (e) => {
        if (isSpeaking) return;
        e.preventDefault();
        if (!prompt.trim() || !socket || isLoading) return;

        // Clear the speech queue when starting a new conversation
        speechQueue.current = [];
        if (currentUtterance.current) {
            speechSynthesis.cancel();
        }

        // Add user message
        setMessages((prev) => [
            ...prev,
            {
                text: prompt,
                role: "user",
            },
        ]);

        // Send message to server
        socket.emit("llm_request", JSON.stringify({ prompt: prompt }));
        setIsLoading(true);
        setPrompt("");
    };

    // const toggleSpeech = () => {
    //     if (!speechEnabled) {
    //         // If enabling speech, process any queued items
    //         setSpeechEnabled(true);
    //         processSpeechQueue();
    //     } else {
    //         // If disabling speech, clear queue and stop current speech
    //         setSpeechEnabled(false);
    //         speechQueue.current = [];
    //         if (currentUtterance.current) {
    //             speechSynthesis.cancel();
    //         }
    //     }
    // };

    // Queue status for debugging (optional)
    const queueStatus = `Queue length: ${speechQueue.current.length}`;

    return (
        <div className="bg-[url('/isdlBG.jpg')] bg-cover h-screen w-screen">
            <div className="font-mono flex items-center justify-center w-screen h-screen pt-5 pb-5 backdrop-blur-sm backdrop-brightness-50">
                {/* Team stats */}
                <TeamStats
                    team="RealMadrid"
                    goals={team1Stats.goals}
                    redCards={team1Stats.redCards}
                    yellowCards={team1Stats.yellowCards}
                />

                <div className="w-3/5 flex flex-col h-full">
                    {/* Controls */}
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

                    {/* Chat container */}
                    <div className="flex-grow mb-4 overflow-hidden rounded-lg bg-[#0e181c] border shadow">
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

                    {/* Input form */}
                    <form
                        onSubmit={handleSubmit}
                        className="flex gap-2"
                    >
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-grow h-20 resize-none rounded-lg border bg-[#0e181c] text-white p-2 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!prompt.trim() || isLoading || isSpeaking}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line
                                    x1="22"
                                    y1="2"
                                    x2="11"
                                    y2="13"
                                />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </form>
                </div>

                {/* Team stats */}
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
