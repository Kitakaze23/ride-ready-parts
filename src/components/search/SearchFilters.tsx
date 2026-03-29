import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SearchFiltersProps {
  type: string;
  setType: (v: string) => void;
  brandId: string;
  setBrandId: (v: string) => void;
  modelId: string;
  setModelId: (v: string) => void;
  generationId: string;
  setGenerationId: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  priceMin: string;
  setPriceMin: (v: string) => void;
  priceMax: string;
  setPriceMax: (v: string) => void;
  brands: any[];
  models: any[];
  generations: any[];
  categories: any[];
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function SearchFilters({
  type, setType, brandId, setBrandId, modelId, setModelId,
  generationId, setGenerationId,
  condition, setCondition, categoryId, setCategoryId,
  priceMin, setPriceMin, priceMax, setPriceMax,
  brands, models, generations, categories,
  showFilters, setShowFilters, onClear, hasFilters,
}: SearchFiltersProps) {
  return (
    <aside className={`${showFilters ? 'fixed inset-0 z-50 overflow-y-auto bg-background p-4 md:static md:p-0' : 'hidden'} w-full shrink-0 space-y-4 md:block md:w-56`}>
      {showFilters && (
        <div className="flex items-center justify-between md:hidden">
          <h2 className="font-display text-lg font-bold">Фильтры</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Тип</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Все" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="part">Запчасти</SelectItem>
            <SelectItem value="motorcycle">Мотоциклы</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Марка</Label>
        <Select value={brandId} onValueChange={(v) => { setBrandId(v); setModelId(''); setGenerationId(''); }}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Любая" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любая</SelectItem>
            {brands?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {brandId && brandId !== 'all' && models && models.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground">Модель</Label>
          <Select value={modelId} onValueChange={(v) => { setModelId(v); setGenerationId(''); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Любая" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любая</SelectItem>
              {models.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {modelId && modelId !== 'all' && generations && generations.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground">Год / поколение</Label>
          <Select value={generationId} onValueChange={setGenerationId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Любое" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любое</SelectItem>
              {generations.map((g: any) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}{g.year_from ? ` (${g.year_from}–${g.year_to || '...'})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Категория</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Все" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Состояние</Label>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Любое" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любое</SelectItem>
            <SelectItem value="new">Новый</SelectItem>
            <SelectItem value="used">Б/У</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Цена (₽)</Label>
        <div className="mt-1 flex gap-2">
          <Input
            type="number"
            placeholder="от"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="flex-1"
            min="0"
          />
          <Input
            type="number"
            placeholder="до"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="flex-1"
            min="0"
          />
        </div>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="w-full text-muted-foreground">
          Сбросить фильтры
        </Button>
      )}

      {showFilters && (
        <Button className="w-full md:hidden" onClick={() => setShowFilters(false)}>
          Показать результаты
        </Button>
      )}
    </aside>
  );
}
