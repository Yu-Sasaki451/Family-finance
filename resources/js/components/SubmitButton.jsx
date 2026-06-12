import "../../css/components/SubmitButton.css";

const SubmitButton = ({ onUpdate, onDelete }) => {
    return (
        <div className="buttons">
            <button
                className="submitButton updateButton"
                type="button"
                onClick={onUpdate}
            >
                変更
            </button>
            <button
                className="submitButton deleteButton"
                type="button"
                onClick={onDelete}
            >
                削除
            </button>
        </div>
    );
};

export default SubmitButton;
