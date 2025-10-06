import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { ClipboardList, CheckCircle, Clock, AlertCircle, MapPin, Calendar, Users } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface AdminTasksButtonProps {
  user: any;
}

export function AdminTasksButton({ user }: AdminTasksButtonProps) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadAdminTasks();
    }
  }, [open]);

  const loadAdminTasks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No access token available');
        return;
      }

      // Cargar tareas asignadas específicamente a este administrador
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-55f0477a/tasks`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo las tareas asignadas a este administrador por su ID
        const adminTasks = (data.tasks || []).filter(task => 
          task.assignedUsers && task.assignedUsers.includes(user.id)
        );
        setTasks(adminTasks);
      } else {
        console.error('Error loading admin tasks:', await response.text());
      }
    } catch (error) {
      console.error('Error loading admin tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const markTaskAsCompleted = async (taskId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-55f0477a/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        loadAdminTasks(); // Recargar las tareas
      } else {
        console.error('Error completing task:', await response.text());
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.filter(task => !task.completed).length;
    const overdue = tasks.filter(task => 
      !task.completed && new Date(task.endDate) < new Date()
    ).length;

    return { total, completed, pending, overdue };
  };

  const stats = getTaskStats();

  const getStatusIcon = (task) => {
    if (task.completed) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (new Date(task.endDate) < new Date()) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (task) => {
    if (task.completed) return 'text-green-600';
    if (new Date(task.endDate) < new Date()) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusText = (task) => {
    if (task.completed) return 'Completada';
    if (new Date(task.endDate) < new Date()) return 'Vencida';
    return 'Pendiente';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="relative flex items-center space-x-2 sm:space-x-3 lg:space-x-4"
          size={window.innerWidth >= 1024 ? "lg" : "default"}
        >
          <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          <span className="text-sm lg:text-base">Mis Actividades</span>
          {stats.pending > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {stats.pending}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5" />
            <span>Mis Actividades Asignadas</span>
          </DialogTitle>
          <DialogDescription>
            Actividades que me han sido asignadas por otros administradores
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-sm text-gray-600">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.overdue}</p>
                  <p className="text-sm text-gray-600">Vencidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2">Cargando actividades...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No tienes actividades asignadas</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <Card key={task.id} className={`transition-all duration-200 hover:shadow-md ${task.completed ? 'bg-green-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(task)}
                            <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                            <Badge variant={task.priority === 'high' ? "destructive" : task.priority === 'medium' ? "default" : "secondary"}>
                              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{task.workArea}</span>
                            </div>
                            
                            {task.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate max-w-32">{task.location.address}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className={`text-sm font-medium ${getStatusColor(task)}`}>
                              {getStatusText(task)}
                            </span>
                            
                            {!task.completed && (
                              <Button
                                size="sm"
                                onClick={() => markTaskAsCompleted(task.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Marcar Completada
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}