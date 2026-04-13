export default function SeatPicker({
  seats = [],
  selectedSeatId,
  selectedSeatIds,
  onSelectSeat,
  onToggleSeat,
}) {
  const SEAT_WIDTH = 52;
  const SEAT_GAP = 8;

  const getRowIndex = (rowLetter) => {
    const value = String(rowLetter || "").trim().toUpperCase();
    if (!value) {
      return 0;
    }

    if (/^\d+$/.test(value)) {
      return Math.max(Number(value) - 1, 0);
    }

    return Math.max(value.charCodeAt(0) - 65, 0);
  };

  const getPosition = (seat) => {
    const rowIndex =
      seat.grid_row !== undefined && seat.grid_row !== null
        ? seat.grid_row
        : getRowIndex(seat.row);

    const colIndex =
      seat.grid_col !== undefined && seat.grid_col !== null
        ? seat.grid_col
        : Math.max(Number(seat.number) - 1, 0);

    return { rowIndex, colIndex };
  };

  const buildSeatMatrix = (seatsList = []) => {
    if (!seatsList.length) {
      return { rows: 0, cols: 0, seatMap: new Map() };
    }

    let maxRowIndex = 0;
    let maxColIndex = 0;
    const seatMap = new Map();

    seatsList.forEach((seat) => {
      const position = getPosition(seat);
      maxRowIndex = Math.max(maxRowIndex, position.rowIndex);
      maxColIndex = Math.max(maxColIndex, position.colIndex);
      seatMap.set(`${position.rowIndex}-${position.colIndex}`, seat);
    });

    return {
      rows: maxRowIndex + 1,
      cols: maxColIndex + 1,
      seatMap,
    };
  };

  const matrix = buildSeatMatrix(seats);
  const matrixWidth =
    matrix.cols > 0 ? matrix.cols * SEAT_WIDTH + (matrix.cols - 1) * SEAT_GAP : 0;

  const selectedSet = new Set(
    Array.isArray(selectedSeatIds)
      ? selectedSeatIds
      : selectedSeatId
      ? [selectedSeatId]
      : []
  );

  const handleSeatClick = (seatId) => {
    if (onToggleSeat) {
      onToggleSeat(seatId);
      return;
    }

    if (onSelectSeat) {
      onSelectSeat(seatId);
    }
  };

  if (!seats.length) {
    return (
      <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
        No seats available.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
      <div className="text-center text-sm font-medium text-muted-foreground">Screen</div>

      <div
        className="mx-auto h-2 rounded-full bg-gradient-to-r from-primary/40 via-primary/70 to-primary/40"
        style={{ width: matrixWidth ? `${matrixWidth}px` : "100%" }}
      />

      <div className="overflow-x-auto">
        <div
          className="mx-auto space-y-2"
          style={{ width: matrixWidth ? `${matrixWidth}px` : "100%" }}
        >
          {Array.from({ length: matrix.rows }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${matrix.cols}, minmax(0, 1fr))`,
                gap: `${SEAT_GAP}px`,
              }}
            >
              {Array.from({ length: matrix.cols }, (_, colIndex) => {
                const seat = matrix.seatMap.get(`${rowIndex}-${colIndex}`);

                if (!seat) {
                  return <div key={`${rowIndex}-${colIndex}`} className="h-10" aria-hidden="true" />;
                }

                const isSelected = selectedSet.has(seat.id);
                const isDisabled = !!seat.occupied;

                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleSeatClick(seat.id)}
                    className={[
                      "h-10 rounded-lg border text-xs font-semibold transition shadow-sm",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : isDisabled
                        ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-primary/10",
                    ].join(" ")}
                    title={`${seat.row}${seat.number}${seat.occupied ? " - occupied" : ""}`}
                  >
                    {seat.row}
                    {seat.number}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-border bg-card" />
          <span>Free</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-primary bg-primary" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-border bg-muted" />
          <span>Occupied</span>
        </div>
      </div>
    </div>
  );
}
