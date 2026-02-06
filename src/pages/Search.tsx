/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search as SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const Search = () => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!term.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.search(term);
      setResults(result);
      
      const totalResults = (result.models?.length || 0) + (result.groups?.length || 0);
      if (totalResults === 0) {
        toast.info('No results found');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to search');
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const lowerTerm = term.toLowerCase();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search</h1>
      <p className="text-muted-foreground">Search by model number, Telx model number, serial number, or MAC ID</p>
      
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input 
          placeholder="Enter model number, serial, or MAC..." 
          value={term} 
          onChange={(e) => setTerm(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          <SearchIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {results?.models?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Models ({results.models.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {results.models.map((m: any) => (
              <Link 
                key={m.id} 
                to={`/models/${m.model_number}`} 
                className="block p-4 hover:bg-accent rounded-lg border transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">{m.model_number}</div>
                    {m.telx_model_number && (
                      <div className="text-sm text-muted-foreground">Telx: {m.telx_model_number}</div>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">Category:</span> {m.category_name} | 
                      <span className="font-medium"> Type:</span> {m.type} | 
                      <span className="font-medium"> Chipset:</span> {m.chipset_name}
                    </div>
                    {m.description && (
                      <div className="text-sm text-muted-foreground">{m.description}</div>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <div><span className="font-medium">Generated:</span> {m.generated_count}</div>
                    <div className="text-muted-foreground">MACs/Serial: {m.macs_per_serial}</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {results?.groups?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Serial/MAC Matches ({results.groups.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.groups.map((g: any) => {
              const matchingSerials = (g.serials as Array<{ serialNumber: string; macIds: string[] }>).filter(
                (serial) =>
                  serial.serialNumber.toLowerCase().includes(term.toLowerCase()) ||
                  serial.macIds.some((mac) => mac.toLowerCase().includes(term.toLowerCase()))
              );
              
              return (
                <div key={g.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Link to={`/models/${g.model_number}`} className="font-semibold text-lg text-primary hover:underline">
                      {g.model_number}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {new Date(g.generated_at).toLocaleString()}
                    </div>
                  </div>
                  {g.telx_model_number && (
                    <div className="text-sm text-muted-foreground mb-2">Telx: {g.telx_model_number}</div>
                  )}
                  <div className="text-sm mb-2">
                    <span className="font-medium">Region:</span> {g.region_id} | 
                    <span className="font-medium"> Prefix:</span> {g.suffix}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium">Matching Serials:</div>
                    {matchingSerials.slice(0, 3).map((serial, idx) => (
                      <div key={idx} className="text-sm bg-muted p-2 rounded">
                        <div className="font-medium">{serial.serialNumber}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          MACs:{' '}
                          {serial.macIds.map((mac, i) => (
                            <span key={mac}>
                              <span className={mac.toLowerCase().includes(lowerTerm) ? 'bg-yellow-200 text-black rounded px-1' : ''}>{mac}</span>
                              {i < serial.macIds.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {matchingSerials.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{matchingSerials.length - 3} more matches
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {results && results.models?.length === 0 && results.groups?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No results found for "{term}"
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Search;
