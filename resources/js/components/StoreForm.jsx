import "../../css/components/StoreForm.css";

const StoreForm = ({ name, onNameChange, onSubmit }) => {
    return (
        <form className="storeForm" onSubmit={onSubmit}>
            <input
                className="storeInput"
                type="text"
                value={name}
                onChange={onNameChange}
                placeholder="カテゴリ名"
            />
            <button className="storeButton" type="submit">
                登録
            </button>
        </form>
    );
};

export default StoreForm;
