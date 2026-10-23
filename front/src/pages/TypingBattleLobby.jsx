import RoomLobby from "../components/RoomLobby"

// 친구와 타자 대결 - 시작 화면 (/typing/battle)
const TypingBattleLobby = () => (
  <RoomLobby
    title="친구와 타자 대결"
    kind="typing"
    roomPath="/typing/battle"
    createDesc="새 방을 만들고 친구에게 방 코드나 링크를 보내요."
  />
)

export default TypingBattleLobby
