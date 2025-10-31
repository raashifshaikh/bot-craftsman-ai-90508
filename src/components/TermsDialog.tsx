import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function TermsDialog({ open, onOpenChange, onAccept }: TermsDialogProps) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Terms and Conditions</AlertDialogTitle>
          <AlertDialogDescription>
            Please read and accept our terms to continue
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="h-[400px] w-full rounded border p-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-foreground mb-2">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using BotForge AI, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">2. Use License</h3>
              <p className="text-muted-foreground">
                Permission is granted to temporarily use BotForge AI for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">3. User Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>You are responsible for all bots created using this platform</li>
                <li>You must comply with Telegram's Terms of Service</li>
                <li>You must not create bots for illegal activities</li>
                <li>You must not spam or harass users</li>
                <li>You must secure your bot tokens and API keys</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">4. Data and Privacy</h3>
              <p className="text-muted-foreground">
                For guest users, all data is stored locally in your browser. For registered users, data is stored securely in our cloud infrastructure. We do not share your data with third parties.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">5. AI-Generated Content</h3>
              <p className="text-muted-foreground">
                Bot responses are generated using AI. You are responsible for reviewing and moderating all AI-generated content before deploying your bots.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">6. Limitations of Liability</h3>
              <p className="text-muted-foreground">
                BotForge AI is provided "as is" without warranties. We are not liable for any damages arising from the use of this service, including data loss, bot failures, or service interruptions.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">7. API Usage</h3>
              <p className="text-muted-foreground">
                You are responsible for any costs associated with third-party APIs (Telegram, OpenAI, etc.) connected to your bots.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">8. Termination</h3>
              <p className="text-muted-foreground">
                We reserve the right to terminate or suspend access to our service immediately, without prior notice, for conduct that violates these Terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">9. Changes to Terms</h3>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">10. Contact</h3>
              <p className="text-muted-foreground">
                For questions about these Terms, please contact us through our support channels.
              </p>
            </section>
          </div>
        </ScrollArea>

        <div className="flex items-center space-x-2 py-4">
          <Checkbox 
            id="terms" 
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I have read and accept the terms and conditions
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setAccepted(false)}>
            Decline
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept} disabled={!accepted}>
            Accept & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
