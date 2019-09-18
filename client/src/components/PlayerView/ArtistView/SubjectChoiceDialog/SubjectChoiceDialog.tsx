import * as React from 'react';
import { Subject } from '../../../../models/interfaces/Subject';
import { Dialog, DialogTitle, DialogContent, DialogContentText, List, ListItem, ListItemAvatar, ListItemText, Icon } from '@material-ui/core';
import s from './SubjectChoiceDialog.module.scss';

export interface SubjectChoiceDialogProps {
  socket: SocketIOClient.Socket;
  onSelectedSubject: (newSubject: Subject) => void;
}

export function SubjectChoiceDialog({
  socket,
  onSelectedSubject
}: SubjectChoiceDialogProps): JSX.Element {

  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [openDialog, setOpenDialog] = React.useState<boolean>(false);

  React.useEffect(() => {
    socket.on('newSubjectChoices', (newSubjects: Subject[]) => {

      if (!newSubjects) return;

      setSubjects(newSubjects);
      setOpenDialog(true);
    });
  }, []);

  return (
    <Dialog
      open={openDialog}
      aria-labelledby="subject-choice-title"
      aria-describedby="subject-choice-description"
    >
      <DialogTitle id="subject-choice-title">
        Choose a subject!
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="subject-choice-description">
          Its your turn to choose a subject. Pick one from these choices.
        </DialogContentText>

        <List>
          {
            subjects.map((subject: Subject, i: number) => (
              <div className={s.rowWrapper} key={`sCh${i}`} onClick={() => { onSelectedSubject(subject); setOpenDialog(false); }}>
                <ListItem
                  className={s.row}
                  alignItems="center"
                >
                  <ListItemAvatar>
                    <Icon fontSize="large">
                      {subject.topic.iconName}
                    </Icon>
                  </ListItemAvatar>
                  <ListItemText
                    primary={subject.text}
                    secondary={subject.topic.name}
                  />
                </ListItem>
              </div>
            ))
          }
        </List>

      </DialogContent>
    </Dialog>
  )
}
