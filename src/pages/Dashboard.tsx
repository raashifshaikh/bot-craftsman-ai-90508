import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, LogOut, Plus, History, FolderOpen, User, Settings, Bell, Search, LogIn } from 'lucide-react';
import ProjectForm from '@/components/bot-builder/ProjectForm';
import ProjectsList from '@/components/dashboard/ProjectsList';
import GenerationHistory from '@/components/dashboard/GenerationHistory';
import { TermsDialog } from '@/components/TermsDialog';
import { GuestWarningDialog } from '@/components/GuestWarningDialog';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('projects');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [termsAccepted, setTermsAccepted] = useLocalStorage('termsAccepted', false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [guestWarningShown, setGuestWarningShown] = useLocalStorage('guestWarningShown', false);

  useEffect(() => {
    if (!loading) {
      if (!termsAccepted) {
        setShowTermsDialog(true);
      } else if (!user && !guestWarningShown) {
        setShowGuestWarning(true);
      }
    }
  }, [loading, termsAccepted, user, guestWarningShown]);

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTermsDialog(false);
    if (!user && !guestWarningShown) {
      setShowGuestWarning(true);
    }
  };

  const handleGuestContinue = () => {
    setGuestWarningShown(true);
    setShowGuestWarning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Auth is now optional - users can work as guests

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  BotForge AI
                </h1>
              </div>
              <Badge variant="secondary" className="hidden sm:flex">
                Beta
              </Badge>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  </Button>
                  
                  <div className="relative">
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="hidden sm:block text-sm font-medium">{user.email}</span>
                    </Button>
                    
                    {showUserMenu && (
                      <div className="absolute right-0 top-12 w-48 bg-card rounded-lg shadow-lg border py-2 z-50">
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Profile
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Settings
                        </button>
                        <div className="border-t my-1"></div>
                        <button 
                          className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-destructive"
                          onClick={signOut}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Button onClick={() => navigate('/auth')}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar - Mobile */}
          <div className="md:hidden mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome{user ? ` back, ${user.email?.split('@')[0]}` : ' to BotForge AI'}! 👋
          </h2>
          <p className="text-muted-foreground">
            {user 
              ? 'Ready to create your next AI-powered chatbot?' 
              : 'Create powerful Telegram bots with AI - no coding required!'}
          </p>
          {!user && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Guest Mode: Your data is saved locally. Create an account to save bots permanently.
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                +1 currently building
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Generations</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">
                +5 today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Projects</span>
              </TabsTrigger>
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Bot</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'projects' && (
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            )}
          </div>

          <TabsContent value="projects" className="space-y-4">
            <ProjectsList />
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Bot</CardTitle>
                <CardDescription>
                  Configure your AI chatbot with the options below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectForm onSuccess={() => setActiveTab('projects')} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <GenerationHistory />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <TermsDialog 
        open={showTermsDialog}
        onOpenChange={setShowTermsDialog}
        onAccept={handleTermsAccept}
      />
      <GuestWarningDialog
        open={showGuestWarning}
        onOpenChange={setShowGuestWarning}
        onContinue={handleGuestContinue}
      />

      {/* Footer */}
      <footer className="border-t bg-white/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <span className="font-semibold">BotForge AI</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary">Documentation</a>
              <a href="#" className="hover:text-primary">Support</a>
              <a href="#" className="hover:text-primary">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
      }
