import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const getRowLetter = (index) => String.fromCharCode(65 + index);

function buildEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  );
}

function buildGridFromSeats(rows, cols, seats = []) {
  const grid = buildEmptyGrid(rows, cols);

  seats.forEach((seat) => {
    if (
      seat.grid_row >= 0 &&
      seat.grid_row < rows &&
      seat.grid_col >= 0 &&
      seat.grid_col < cols
    ) {
      grid[seat.grid_row][seat.grid_col] = true;
    }
  });

  return grid;
}

function convertGridToSeats(grid) {
  const seats = [];

  for (let r = 0; r < grid.length; r++) {
    const rowLetter = getRowLetter(r);

    let seatNumber = 1;

    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) continue;

      seats.push({
        row: rowLetter,
        number: seatNumber,
        grid_row: r,
        grid_col: c,
      });

      seatNumber += 1;
    }
  }

  return seats;
}

export default function HallLayoutEditor({
  initialRows = 8,
  initialCols = 12,
  initialSeats = [],
  value,
  onChange,
}) {
  const [rows, setRows] = useState(initialRows);
  const [cols, setCols] = useState(initialCols);
  const [grid, setGrid] = useState(() =>
    buildGridFromSeats(initialRows, initialCols, initialSeats)
  );

  useEffect(() => {
    if (value) {
      const maxRow = value.length
        ? Math.max(...value.map((seat) => seat.grid_row)) + 1
        : initialRows;

      const maxCol = value.length
        ? Math.max(...value.map((seat) => seat.grid_col)) + 1
        : initialCols;

      const nextRows = Math.max(initialRows, maxRow);
      const nextCols = Math.max(initialCols, maxCol);

      setRows(nextRows);
      setCols(nextCols);
      setGrid(buildGridFromSeats(nextRows, nextCols, value));
    }
  }, [value, initialRows, initialCols]);

  const seats = useMemo(() => convertGridToSeats(grid), [grid]);

  useEffect(() => {
    onChange?.(seats);
  }, [seats, onChange]);

  const toggleCell = (rowIndex, colIndex) => {
    setGrid((prev) =>
      prev.map((row, r) =>
        row.map((cell, c) => {
          if (r === rowIndex && c === colIndex) {
            return !cell;
          }
          return cell;
        })
      )
    );
  };

  const resizeGrid = (nextRows, nextCols) => {
    setGrid((prev) => {
      const resized = Array.from({ length: nextRows }, (_, r) =>
        Array.from({ length: nextCols }, (_, c) => prev[r]?.[c] ?? false)
      );
      return resized;
    });

    setRows(nextRows);
    setCols(nextCols);
  };

  const clearGrid = () => {
    setGrid(buildEmptyGrid(rows, cols));
  };

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="rows">Rânduri</Label>
          <input
            id="rows"
            type="number"
            min={1}
            value={rows}
            onChange={(e) => resizeGrid(Math.max(1, Number(e.target.value)), cols)}
            className="rounded-md border px-3 py-2"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cols">Coloane grid</Label>
          <input
            id="cols"
            type="number"
            min={1}
            value={cols}
            onChange={(e) => resizeGrid(rows, Math.max(1, Number(e.target.value)))}
            className="rounded-md border px-3 py-2"
          />
        </div>

        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={clearGrid}>
            Resetează
          </Button>
        </div>
      </div>

      <div className="text-center text-sm font-medium text-muted-foreground">
        Ecran
      </div>

      <div className="mx-auto h-2 w-56 rounded-full bg-muted" />

      <div className="overflow-auto">
        <div className="inline-block min-w-full space-y-2">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2">
              <div className="w-8 text-sm font-medium">{getRowLetter(rowIndex)}</div>

              <div className="flex gap-2">
                {row.map((isSeat, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    onClick={() => toggleCell(rowIndex, colIndex)}
                    className={[
                      "h-10 w-10 rounded-md border text-xs font-medium transition",
                      isSeat
                        ? "border-black bg-black text-white"
                        : "border-dashed border-gray-300 bg-white text-gray-400 hover:bg-gray-50",
                    ].join(" ")}
                    title={
                      isSeat
                        ? `Loc ${getRowLetter(rowIndex)}`
                        : "Celulă goală"
                    }
                  >
                    {isSeat ? "Loc" : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-muted/40 p-3 text-sm">
        <div className="font-medium">Preview locuri generate</div>
        <div className="mt-2 text-muted-foreground">
          Locurile sunt numerotate automat de la stânga la dreapta, separat pe fiecare rând.
        </div>
        <div className="mt-3 max-h-40 overflow-auto rounded-md border bg-white p-2 font-mono text-xs">
          {JSON.stringify(seats, null, 2)}
        </div>
      </div>
    </div>
  );
}