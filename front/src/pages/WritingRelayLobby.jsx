import RoomLobby from "../components/RoomLobby"

// 친구와 공동 이어쓰기 - 시작 화면 (/writing/relay)
// 방 화면 주소는 /writing/room/:roomId 예요.
const WritingRelayLobby = () => (
  <RoomLobby
    title="친구와 이어쓰기"
    kind="relay"
    roomPath="/writing/room"
    createDesc="방을 만들고 친구들을 불러, 한 사람씩 돌아가며 이야기를 이어 써요."
  />
)

export default WritingRelayLobby
