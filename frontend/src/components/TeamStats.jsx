import PropTypes from "prop-types";

export default function TeamStats({ team, goals, redCards, yellowCards }) {
    return (
        <div className="w-1/5 h-full flex flex-col justify-center items-center gap-12">
            <div>
                <img
                    src={team + ".png"}
                    alt={team}
                    className="h-56 w-56 object-cover"
                />
                <h2 className="text-2xl font-bold text-center">{team}</h2>
            </div>
            <div className="w-1/2 flex flex-col gap-3">
                {/* goals */}
                <div className="flex justify-between">
                    <img
                        src="goal.png"
                        alt="goals"
                        className="h-10 w-10 "
                    />
                    <p className="text-2xl font-bold">{goals}</p>
                </div>

                {/* yellow cards */}
                <div className="flex justify-between">
                    <img
                        src="yellowcard.png"
                        alt="yellow cards"
                        className="h-10 w-10 "
                    />
                    <p className="text-2xl font-bold">{yellowCards}</p>
                </div>

                {/* red cards */}
                <div className="flex justify-between">
                    <img
                        src="redcard.webp"
                        alt="red cards"
                        className="h-10 w-10 "
                    />
                    <p className="text-2xl font-bold">{redCards}</p>
                </div>
            </div>
        </div>
    );
}

TeamStats.propTypes = {
    team: PropTypes.string.isRequired,
    goals: PropTypes.number,
    redCards: PropTypes.number,
    yellowCards: PropTypes.number,
};
