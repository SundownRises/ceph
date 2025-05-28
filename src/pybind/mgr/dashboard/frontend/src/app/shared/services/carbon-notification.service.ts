import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CarbonNotificationService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  private doNotDisturbSubject = new BehaviorSubject<boolean>(false);
  doNotDisturb$ = this.doNotDisturbSubject.asObservable();

  toggleCarbonSidebar() {
    const currentState = this.isOpenSubject.getValue();
    this.isOpenSubject.next(!currentState);
  }

  closeCarbonSidebar() {
    this.isOpenSubject.next(false);
  }

  toggleDoNotDisturb() {
    const currentState = this.doNotDisturbSubject.getValue();
    this.doNotDisturbSubject.next(!currentState);
  }
} 