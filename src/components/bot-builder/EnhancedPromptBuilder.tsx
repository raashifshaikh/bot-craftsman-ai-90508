import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Lightbulb, Check, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PROMPT_TEMPLATES = [
  {
    id: 'customer-support',
    name: 'Customer Support Bot',
    category: 'Support',
    description: 'Handle FAQs, create tickets, and escalate to humans',
    prompt: `Create a customer support bot that can:
- Answer frequently asked questions
- Create support tickets
- Check ticket status
- Escalate complex issues to human agents
- Provide business hours information
- Collect customer feedback

Include commands: /start, /help, /ticket, /status, /contact, /hours, /feedback`,
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Bot',
    category: 'Commerce',
    description: 'Product catalog, cart, and checkout management',
    prompt: `Create an e-commerce shopping bot that can:
- Browse product catalog with categories
- Search for products
- Add items to cart
- View and modify cart
- Process checkout
- Track orders
- Handle returns and refunds

Include commands: /start, /browse, /search, /cart, /checkout, /orders, /track, /return`,
  },
  {
    id: 'booking',
    name: 'Booking & Reservation Bot',
    category: 'Business',
    description: 'Appointment scheduling and management',
    prompt: `Create a booking bot that can:
- Show available time slots
- Book appointments
- Modify or cancel bookings
- Send reminders
- Check booking status
- Handle waitlist
- Provide location information

Include commands: /start, /book, /available, /mybookings, /cancel, /reschedule, /location, /help`,
  },
  {
    id: 'education',
    name: 'Educational Bot',
    category: 'Education',
    description: 'Learning content delivery and quizzes',
    prompt: `Create an educational bot that can:
- Deliver learning content in modules
- Provide interactive quizzes
- Track learning progress
- Offer practice exercises
- Provide study resources
- Answer subject-specific questions
- Send study reminders

Include commands: /start, /learn, /quiz, /progress, /practice, /resources, /help, /schedule`,
  },
  {
    id: 'fitness',
    name: 'Fitness & Wellness Bot',
    category: 'Health',
    description: 'Workout plans and health tracking',
    prompt: `Create a fitness bot that can:
- Provide personalized workout plans
- Track daily exercises
- Log nutrition and calories
- Set fitness goals
- Send workout reminders
- Provide health tips
- Calculate BMI and other metrics

Include commands: /start, /workout, /log, /goals, /progress, /nutrition, /tips, /calculate, /remind`,
  },
  {
    id: 'event',
    name: 'Event Management Bot',
    category: 'Business',
    description: 'Event registration and updates',
    prompt: `Create an event management bot that can:
- List upcoming events
- Register attendees
- Send event updates
- Provide event details and schedules
- Handle ticket sales
- Send reminders
- Collect feedback post-event

Include commands: /start, /events, /register, /mytickets, /schedule, /venue, /speakers, /feedback`,
  },
];

interface EnhancedPromptBuilderProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate?: () => void;
}

export function EnhancedPromptBuilder({ value, onChange, onGenerate }: EnhancedPromptBuilderProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const getPromptQuality = () => {
    const length = value.length;
    const hasCommands = value.toLowerCase().includes('command');
    const hasFeatures = value.toLowerCase().includes('can') || value.toLowerCase().includes('should');
    
    let score = 0;
    if (length > 50) score += 25;
    if (length > 100) score += 25;
    if (hasCommands) score += 25;
    if (hasFeatures) score += 25;

    if (score >= 75) return { label: 'Excellent', color: 'bg-green-500', score };
    if (score >= 50) return { label: 'Good', color: 'bg-blue-500', score };
    if (score >= 25) return { label: 'Fair', color: 'bg-yellow-500', score };
    return { label: 'Needs Work', color: 'bg-red-500', score };
  };

  const quality = getPromptQuality();

  const useTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    onChange(template.prompt);
    setSelectedTemplate(template.id);
    toast({
      title: 'Template Applied',
      description: `${template.name} template has been loaded`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Bot Requirements</Label>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'simple' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('simple')}
          >
            Simple
          </Button>
          <Button
            variant={mode === 'advanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('advanced')}
          >
            Advanced
          </Button>
        </div>
      </div>

      {mode === 'advanced' && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Choose a Template
            </CardTitle>
            <CardDescription className="text-xs">
              Start with a pre-built template and customize it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Support">Support</TabsTrigger>
                <TabsTrigger value="Commerce">Commerce</TabsTrigger>
                <TabsTrigger value="Business">Business</TabsTrigger>
              </TabsList>
              {['all', 'Support', 'Commerce', 'Business'].map((category) => (
                <TabsContent key={category} value={category} className="space-y-2 mt-3">
                  {PROMPT_TEMPLATES.filter(t => category === 'all' || t.category === category).map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => useTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                          {selectedTemplate === template.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="requirements">Describe your bot</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {value.length} chars
            </span>
            <Badge variant="outline" className={quality.color}>
              {quality.label}
            </Badge>
          </div>
        </div>
        
        <Textarea
          id="requirements"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === 'simple' 
            ? "Describe what your bot should do... (e.g., 'A customer support bot that can answer FAQs and create tickets')" 
            : "Describe your bot's features, commands, and behavior in detail..."}
          rows={mode === 'simple' ? 6 : 12}
          className="resize-none font-mono text-sm"
        />

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium">Tips for better results:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Specify the main purpose and features</li>
                <li>List specific commands you want (e.g., /start, /help)</li>
                <li>Describe the bot's personality and tone</li>
                <li>Mention any integrations or APIs needed</li>
                <li>Include example conversations if possible</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${quality.color}`}
            style={{ width: `${quality.score}%` }}
          />
        </div>
      </div>

      {onGenerate && (
        <Button 
          onClick={onGenerate} 
          className="w-full"
          disabled={!value.trim() || quality.score < 25}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Generate Bot
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
