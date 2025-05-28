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
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  closeCarbonSidebar() {
    this.isOpenSubject.next(false);
  }

  toggleDoNotDisturb() {
    this.doNotDisturbSubject.next(!this.doNotDisturbSubject.value);
  }
} 