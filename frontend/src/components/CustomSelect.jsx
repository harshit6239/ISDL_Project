import PropTypes from "prop-types";

const CustomSelect = ({
    name,
    options,
    value,
    onChange,
    label,
    getRelevantFields,
}) => {
    const relevantFields = getRelevantFields();

    if (!relevantFields.includes(name)) {
        return null;
    }

    return (
        <div className="flex flex-col space-y-1">
            <label className="text-white text-sm font-semibold">{label}</label>
            <select
                name={name}
                value={value}
                onChange={onChange}
                className="customSelect"
            >
                {options.map((option) => (
                    <option
                        key={option}
                        value={option}
                    >
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
};

CustomSelect.propTypes = {
    name: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.string.isRequired,
    getRelevantFields: PropTypes.func.isRequired,
};

export default CustomSelect;
