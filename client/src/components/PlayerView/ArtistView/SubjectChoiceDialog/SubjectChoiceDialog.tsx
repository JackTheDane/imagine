import * as React from 'react';
import { Subject } from '../../../../models/interfaces/Subject';
import { Dialog, DialogTitle, DialogContent, DialogContentText, Button, List, ListItem, ListItemAvatar, ListItemText, Icon } from '@material-ui/core';
import s from './SubjectChoiceDialog.module.scss';

export interface SubjectChoiceDialogProps {
  availableSubjects: Subject[];
  onSelectedSubject: (newSubject: Subject) => void;
}

export function SubjectChoiceDialog({
  availableSubjects,
  onSelectedSubject
}: SubjectChoiceDialogProps): JSX.Element {

  return (
    <Dialog
      open={true}
      aria-labelledby="alert-dialog-slide-title"
      aria-describedby="alert-dialog-slide-description"
    >
      <DialogTitle id="alert-dialog-slide-title">
        Choose a subject!
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-slide-description">
          Its your turn to choose a subject. Pick one from these choices.
        </DialogContentText>

        <List>
          {
            availableSubjects.map((subject: Subject, i: number) => {

              return (
                <div className={s.rowWrapper} key={`sCh${i}`} onClick={() => { onSelectedSubject(subject); }}>
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
              )
            })
          }
        </List>

        <Button />

      </DialogContent>
    </Dialog>
  )
}
