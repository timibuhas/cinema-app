import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hallsApi } from "@/lib/api";
import PageFrame from "@/pages/app/PageFrame";
import LoadingCard from "@/pages/app/LoadingCard";

const CELL_SIZE = 52;
const CELL_GAP = 8;

function toRowLabel(index) {
  return String.fromCharCode(65 + index);
}

function toRowIndex(rowValue) {
  const value = String(rowValue || "").trim().toUpperCase();
  if (!value) {
    return 0;
  }

  if (/^\d+$/.test(value)) {
    return Math.max(Number(value) - 1, 0);
  }

  return Math.max(value.charCodeAt(0) - 65, 0);
}

function toKey(gridRow, gridCol) {
  return `${gridRow}-${gridCol}`;
}

function buildMatrixSeats(rowsCount, colsCount, options = {}) {
  const { previousState = null, activeSet = null, defaultActive = true } = options;
  const seats = [];

  for (let rowIndex = 0; rowIndex < rowsCount; rowIndex += 1) {
    for (let colIndex = 0; colIndex < colsCount; colIndex += 1) {
      const key = toKey(rowIndex, colIndex);

      let active = defaultActive;
      if (previousState && previousState.has(key)) {
        active = previousState.get(key);
      } else if (activeSet) {
        active = activeSet.has(key);
      }

      seats.push({
        row: toRowLabel(rowIndex),
        number: colIndex + 1,
        grid_row: rowIndex,
        grid_col: colIndex,
        active,
      });
    }
  }

  return seats;
}

function deriveDimensionsFromHall(hall) {
  if (!hall?.seats?.length) {
    return { rows: "", seats_per_row: "", activeSet: new Set() };
  }

  const activeSet = new Set();
  let maxRow = 0;
  let maxCol = 0;

  hall.seats.forEach((seat) => {
    const rowIndex = seat.grid_row ?? toRowIndex(seat.row);
    const colIndex = seat.grid_col ?? Math.max(Number(seat.number) - 1, 0);

    maxRow = Math.max(maxRow, rowIndex);
    maxCol = Math.max(maxCol, colIndex);
    activeSet.add(toKey(rowIndex, colIndex));
  });

  return {
    rows: String(maxRow + 1),
    seats_per_row: String(maxCol + 1),
    activeSet,
  };
}

function HallDialog({ trigger, initialValue, onSave }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    rows: "",
    seats_per_row: "",
    seats: [],
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");

    if (!initialValue) {
      setForm({ name: "", rows: "", seats_per_row: "", seats: [] });
      return;
    }

    const dimensions = deriveDimensionsFromHall(initialValue);
    const rowCount = Number(dimensions.rows) || 0;
    const colCount = Number(dimensions.seats_per_row) || 0;

    setForm({
      name: initialValue.name || "",
      rows: dimensions.rows,
      seats_per_row: dimensions.seats_per_row,
      seats:
        rowCount > 0 && colCount > 0
          ? buildMatrixSeats(rowCount, colCount, {
              activeSet: dimensions.activeSet,
              defaultActive: false,
            })
          : [],
    });
  }, [initialValue, open]);

  function handleDimensionChange(field, value) {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      const rowsCount = Number(next.rows);
      const colsCount = Number(next.seats_per_row);

      if (rowsCount > 0 && colsCount > 0) {
        const previousState = new Map(
          previous.seats.map((seat) => [toKey(seat.grid_row, seat.grid_col), seat.active])
        );

        next.seats = buildMatrixSeats(rowsCount, colsCount, {
          previousState,
          defaultActive: true,
        });
      } else {
        next.seats = [];
      }

      return next;
    });
  }

  function toggleSeat(gridRow, gridCol) {
    setForm((previous) => ({
      ...previous,
      seats: previous.seats.map((seat) =>
        seat.grid_row === gridRow && seat.grid_col === gridCol
          ? { ...seat, active: !seat.active }
          : seat
      ),
    }));
  }

  const rowsCount = Number(form.rows) || 0;
  const colsCount = Number(form.seats_per_row) || 0;

  const seatMap = useMemo(
    () => new Map(form.seats.map((seat) => [toKey(seat.grid_row, seat.grid_col), seat])),
    [form.seats]
  );

  const matrixWidth =
    colsCount > 0 ? colsCount * CELL_SIZE + (colsCount - 1) * CELL_GAP : 0;

  const activeSeatsCount = form.seats.filter((seat) => seat.active).length;

  const activeSeatNumberMap = useMemo(() => {
    const map = new Map();

    for (let rowIndex = 0; rowIndex < rowsCount; rowIndex += 1) {
      const activeRowSeats = form.seats
        .filter((seat) => seat.grid_row === rowIndex && seat.active)
        .sort((first, second) => first.grid_col - second.grid_col);

      activeRowSeats.forEach((seat, index) => {
        map.set(toKey(seat.grid_row, seat.grid_col), index + 1);
      });
    }

    return map;
  }, [form.seats, rowsCount]);

  async function handleSave() {
    setError("");

    if (!form.name.trim()) {
      setError("Hall name is required.");
      return;
    }

    if (activeSeatsCount === 0) {
      setError("Select at least one seat (not X).");
      return;
    }

    setSubmitting(true);

    try {
      const normalizedSeats = [];

      for (let rowIndex = 0; rowIndex < rowsCount; rowIndex += 1) {
        const rowLabel = toRowLabel(rowIndex);
        const activeRowSeats = form.seats
          .filter((seat) => seat.grid_row === rowIndex && seat.active)
          .sort((first, second) => first.grid_col - second.grid_col);

        activeRowSeats.forEach((seat, index) => {
          normalizedSeats.push({
            row: rowLabel,
            number: index + 1,
            grid_row: seat.grid_row,
            grid_col: seat.grid_col,
          });
        });
      }

      await onSave({
        ...(initialValue?.id ? { id: initialValue.id } : {}),
        name: form.name.trim(),
        seats: normalizedSeats,
      });

      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit hall" : "Create hall"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="hall-name">Hall name</Label>
            <Input
              id="hall-name"
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, name: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hall-rows">Rows</Label>
              <Input
                id="hall-rows"
                type="number"
                min={1}
                value={form.rows}
                onChange={(event) => handleDimensionChange("rows", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hall-cols">Seats per row</Label>
              <Input
                id="hall-cols"
                type="number"
                min={1}
                value={form.seats_per_row}
                onChange={(event) =>
                  handleDimensionChange("seats_per_row", event.target.value)
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="mb-2 text-center text-sm font-medium text-muted-foreground">Ecran</div>
            <div
              className="mx-auto mb-4 h-2 rounded-full bg-muted"
              style={{ width: matrixWidth ? `${matrixWidth}px` : "100%" }}
            />

            {rowsCount > 0 && colsCount > 0 ? (
              <div className="overflow-x-auto">
                <div className="mx-auto space-y-2" style={{ width: "fit-content" }}>
                  {Array.from({ length: rowsCount }, (_, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="grid"
                      style={{
                        width: matrixWidth ? `${matrixWidth}px` : "100%",
                        gridTemplateColumns: `repeat(${colsCount}, minmax(0, 1fr))`,
                        gap: `${CELL_GAP}px`,
                      }}
                    >
                      {Array.from({ length: colsCount }, (_, colIndex) => {
                        const key = toKey(rowIndex, colIndex);
                        const seat = seatMap.get(key);
                        const rowLabel = toRowLabel(rowIndex);
                        const displayNumber = activeSeatNumberMap.get(key);
                        const active = seat?.active;
                        const seatLabel = displayNumber
                          ? `${rowLabel}${displayNumber}`
                          : `${rowLabel}${colIndex + 1}`;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleSeat(rowIndex, colIndex)}
                            className={[
                              "h-10 rounded-md border text-xs font-semibold transition",
                              active
                                ? "border-gray-300 bg-white text-black hover:bg-gray-50"
                                : "border-dashed border-gray-300 bg-gray-100 text-gray-400",
                            ].join(" ")}
                            title={
                              active
                                ? `Seat ${seatLabel}`
                                : `Seat ${rowLabel}${colIndex + 1} does not exist`
                            }
                          >
                            {active ? seatLabel : "X"}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set rows and seats per row to generate the matrix.
              </p>
            )}
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={submitting || rowsCount <= 0 || colsCount <= 0}
          >
            {submitting ? "Saving..." : "Save hall"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HallsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [halls, setHalls] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const filteredHalls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? halls.filter((hall) => hall.name?.toLowerCase().includes(normalizedQuery))
      : halls;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-desc": return b.name.localeCompare(a.name);
        case "capacity-desc": return (b.capacity || 0) - (a.capacity || 0);
        case "capacity-asc": return (a.capacity || 0) - (b.capacity || 0);
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [halls, query, sortBy]);

  async function loadHalls() {
    setLoading(true);
    setError("");

    try {
      setHalls(await hallsApi.list());
    } catch (loadError) {
      setError(loadError.message || "Could not load halls");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHalls();
  }, []);

  async function saveHall(hallPayload) {
    if (hallPayload.id) {
      await hallsApi.update(hallPayload.id, hallPayload);
    } else {
      await hallsApi.create(hallPayload);
    }

    await loadHalls();
  }

  async function removeHall(hallId) {
    await hallsApi.remove(hallId);
    await loadHalls();
  }

  return (
    <PageFrame
      title="Halls"
      description="Create hall matrices and mark missing seats with X."
      actions={
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search halls"
            className="w-40"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="capacity-desc">Capacity (most)</SelectItem>
              <SelectItem value="capacity-asc">Capacity (fewest)</SelectItem>
            </SelectContent>
          </Select>
          <HallDialog
            onSave={saveHall}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New hall
              </Button>
            }
          />
        </>
      }
    >
      {error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <LoadingCard message="Loading halls..." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredHalls.map((hall) => (
            <Card key={hall.id} className="border-border/60 bg-card/80">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-4 w-4" />
                    {hall.name}
                  </CardTitle>
                  <Badge variant="secondary" className="rounded-lg">
                    {hall.capacity} seats
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Persisted seats: {hall.seats?.length || 0}
                </p>

                <div className="flex items-center gap-2">
                  <HallDialog
                    initialValue={hall}
                    onSave={saveHall}
                    trigger={
                      <Button size="sm" className="gap-1.5 rounded-full bg-amber-500 text-white shadow-sm hover:bg-amber-500/90">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    }
                  />

                  <Button size="sm" className="gap-1.5 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-500/90" onClick={() => removeHall(hall.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredHalls.length === 0 ? (
            <Card className="border-border/60 bg-card/80 sm:col-span-2 xl:col-span-3">
              <CardContent className="p-6 text-sm text-muted-foreground">
                No halls found.
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
