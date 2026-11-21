import { query } from "../src/lib/db/mysql.js";
import { MOCK_ROOMS } from "../src/lib/mock/rooms.js";

async function seedRooms() {
  for (const r of MOCK_ROOMS) {
    await query(
      "INSERT INTO rooms (room_number, floor, capacity, occupied, status) VALUES (?, ?, ?, 0, 'available') ON DUPLICATE KEY UPDATE floor = VALUES(floor)",
      [r.roomNumber, r.floor, r.capacity]
    );
  }
  const c = await query("SELECT COUNT(*) as count FROM rooms");
  console.log("Rooms in MySQL:", c[0].count);
  process.exit(0);
}

seedRooms();
