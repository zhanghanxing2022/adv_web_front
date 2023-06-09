import { Component, OnInit, ViewChild, ViewRef } from '@angular/core';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { ChatInRoomService } from '../chat-in-room.service';
import { UserService } from '../user.service';
import { User } from '../User';
export interface ChatMessage {
  name: string;
  mess: string;
  type: string;
}
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  @ViewChild("bubble") bubble: any;
  @ViewChild("drawer") drawer: any;
  @ViewChild("game") game: any;
  roomList: string[] = ["123", "1233"];
  player_name = "";
  newRoom: string = "";
  new_mess_author = "";
  new_mess_text = "";
  my_room = "";
  user!:User;
  gameSrc = '../../assets/external/index.html';
  messList: ChatMessage[] = [];
  mess = "";
  timeout!: NodeJS.Timeout;
  bubbleOpen = true;
  private url = 'http://localhost:3000';  // 后台服务端口
  constructor(private socket: ChatInRoomService,public router: Router,private userService:UserService) {

    console.log(this.socket);

  }
  ngOnInit(): void {

    this.socket.getRooms().subscribe(
      (data) => {
        this.roomList = data;
      }
    );
    this.socket.getMessage().subscribe(
      (data: any) => {
        this.messList.push(
          {
            name: data.id,
            mess: data.message,
            type: data.type
          }
        )
        this.new_mess_author = data.id;
        this.new_mess_text = data.type === "img" ? "//img" : data.message;
        this.showBubble();
      }
    )
    if(sessionStorage.getItem("token")==null)
    {
      window.alert("请登录")
      this.router.navigateByUrl("user/login")
    }else
    {
      this.userService.profile().subscribe((data)=>
        {
          console.log(data)
          this.user = JSON.parse(JSON.stringify(data));
          if(this.user.username)
          {
            this.player_name =this.user.username ;
            sessionStorage.setItem("username",this.user.username)
          }
          
        })
    }
      
  }
  generateRandomString(): string {
    const currentTime = new Date().getTime(); // 获取当前时间的时间戳
    const randomString = currentTime.toString(36).substring(2, 8); // 将时间戳转换为36进制并截取长度为6的字符串
    return randomString;
  }
  
  ngAfterViewInit(): void {
    console.log(this.drawer);
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    // 在Angular组件中的ngOnInit或其他适当的生命周期钩子中添加以下代码
    window.addEventListener('message', this.handleMessage.bind(this));
    this.closeBubble();
    this.newRoom = String(sessionStorage.getItem("roomId"));
    this.join_room(this.newRoom);
  }

  handleMessage(event: MessageEvent) {
    if (event.data === 'keydown:esc') {
      this.drawer.toggle(); // 调用显示/隐藏弹窗的函数
    }
  }
  handleKeyDown(event: KeyboardEvent) {
    // 检查按下的按键是否为 Esc 键，keyCode 27 表示 Esc 键
    if (event.code === "Escape") {
      this.drawer.toggle(); // 调用显示/隐藏弹窗的函数
    }
  }
  join_room(roomName: string) {
    console.log(roomName);
    this.my_room = roomName;
    this.socket.join_room(roomName);
    this.begin_game();
  }
  begin_game() {
    this.game.nativeElement.style.display = "";
    this.game.nativeElement.src = this.gameSrc;
  }
  create_room() {
    if (this.newRoom) {
      this.my_room = this.newRoom;
      this.socket.create_room(this.newRoom);
    }

  }
  send_message() {
    if (this.mess) {
      this.socket.send_message(
        {
          id: this.player_name,
          message: this.mess,
          type: "text"
        });
      this.mess = "";
    }
    this.showBubble();
  }
  showBubble() {
    console.log(this.drawer._opened)

    if (this.drawer._opened) {

    }
    else {
      this.bubble.nativeElement.style.transform = "translateY(-50px)";
      // this.bubble.nativeElement.style.animation="tada 1.5s";
      // this.bubble.nativeElement.style['animation-play-state']="running";
      if (this.timeout)
        clearTimeout(this.timeout);
      this.timeout = setTimeout(
        () => {
          this.closeBubble(),
            console.log("close")
        }
        , 1000
      );
      this.bubbleOpen = true;
    }


  }
  closeBubble() {
    if (this.bubbleOpen) {
      this.bubble.nativeElement.style.transform = "translateY(50px)";
    }
    this.bubbleOpen = false;

  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if(file.size/1024 >500)
    {
      window.alert("上传文件大与500KB！！")
      return
    }
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64data = reader.result as string;
        // 在这里处理提取到的 base64 编码
        this.socket.send_message(
          {
            id: this.player_name,
            message: base64data,
            type: "img"
          });
      };

      reader.readAsDataURL(file);
    } else {
      // 处理非图片类型的文件
      window.alert("无法上传非图片数据");
    }
  }


  onImageLoad(event: Event) {
    const imgElement = event.target as HTMLImageElement;

    // 获取图片的原始宽度和高度
    const originalWidth = imgElement.naturalWidth;
    const originalHeight = imgElement.naturalHeight;

    // 根据需要调整的尺寸限制，计算合适的宽度和高度
    const maxWidth = 200; // 限制图片的最大宽度为 200px
    const maxHeight = 200; // 限制图片的最大高度为 200px

    let width, height;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      // 计算调整后的宽度和高度
      const widthRatio = maxWidth / originalWidth;
      const heightRatio = maxHeight / originalHeight;
      const scaleFactor = Math.min(widthRatio, heightRatio);

      width = originalWidth * scaleFactor;
      height = originalHeight * scaleFactor;
    } else {
      // 如果图片尺寸未超过限制，则使用原始尺寸
      width = originalWidth;
      height = originalHeight;
    }

    // 设置图片元素的宽度和高度
    imgElement.style.width = `${width}px`;
    imgElement.style.height = `${height}px`;
  }



}
