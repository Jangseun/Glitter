import { useState } from "react";



const TypingSolo = () => {
    const tText = "안녕하세요 좋은 날 이네요";

    const [inputText, setInputText] = useState("");

    const handleChange = (e) => {
        setInputText(e.target.value);

        if (e.target.value === tText){
            setInputText('');
        }
    }
    
    return(
        <div>
            <h1>Welcome to the Typing Solo Page</h1>

            <p>{tText.split('').map((char, index) => {
                let color = 'black';

                if (inputText[index] === undefined) {
                    color = 'gray';
                }
                else if ( inputText[index] === char) {
                    color = 'green';
                }
                else{
                    color = 'red';
                }

                return (
                    <span key={index} style={{ color }}>
                        {char}
                    </span>
                )
            })}
            </p>

            <textarea
                value={inputText}
                onChange={handleChange}
                placeholder="위 문장을 입력해 보세요"
            />

            <p>{inputText.length} / {tText.length}</p>
            
        </div>
    )
}



export default TypingSolo