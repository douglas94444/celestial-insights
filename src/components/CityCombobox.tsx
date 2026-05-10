import { useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CITIES_BR, searchCities, type City } from "@/lib/cities-br";

interface Props {
  value: City | null;
  onChange: (city: City) => void;
}

export function CityCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = query ? searchCities(query, 50) : CITIES_BR.slice(0, 30);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? `${value.name}, ${value.state}` : "Selecione a cidade..."}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar cidade brasileira..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
            <CommandGroup>
              {results.map((city) => (
                <CommandItem
                  key={`${city.name}-${city.state}`}
                  value={`${city.name}-${city.state}`}
                  onSelect={() => {
                    onChange(city);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.name === city.name && value?.state === city.state
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span>
                    {city.name}, <span className="text-muted-foreground">{city.state}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
