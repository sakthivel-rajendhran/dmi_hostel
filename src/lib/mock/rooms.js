/**
 * DMI College Hostel Management PWA - Hostel Rooms Mock Data
 * Single building with 4 floors: GF (G01-G30), F2 (201-230), F3 (301-330), F4 (401-430).
 * 30 rooms per floor, capacity 4 per room.
 */

const FLOORS = [
  { id: "GF", label: "Ground Floor", prefix: "G" },
  { id: "F2", label: "2nd Floor", prefix: "2" },
  { id: "F3", label: "3rd Floor", prefix: "3" },
  { id: "F4", label: "4th Floor", prefix: "4" }
];

export const MOCK_ROOMS = [];

FLOORS.forEach((fl) => {
  for (let r = 1; r <= 30; r++) {
    const pad = String(r).padStart(2, "0");
    const roomNumber = fl.id === "GF" ? `G${pad}` : `${fl.prefix}${pad}`;
    const id = `ROOM-${roomNumber}`;

    let occupied = 0;
    let status = "available";

    // Deterministic occupancy
    if (roomNumber === "G05") {
      occupied = 4;
      status = "full";
    } else if (roomNumber === "304") {
      occupied = 3;
      status = "partial";
    } else if (roomNumber === "204") {
      occupied = 2;
      status = "partial";
    } else if (roomNumber === "412") {
      occupied = 4;
      status = "full";
    } else if (roomNumber === "G15") {
      occupied = 0;
      status = "maintenance";
    } else if (r % 7 === 0) {
      occupied = 2;
      status = "partial";
    } else if (r % 5 === 0) {
      occupied = 1;
      status = "partial";
    }

    MOCK_ROOMS.push({
      id,
      roomNumber,
      roomNo: roomNumber,
      floor: fl.id,
      floorLabel: fl.label,
      capacity: 4,
      occupied,
      status,
    });
  }
});

export default MOCK_ROOMS;
