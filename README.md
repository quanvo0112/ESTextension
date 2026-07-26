# EST extension

VNU HCMUS  
Trường Đại học Khoa học Tự nhiên - Đại học Quốc Gia Thành phố Hồ Chí Minh  

Đây là extension dùng để kéo dữ liệu từ phần danh sách lớp mở đăng ký học phần từ website Portal của trường  

## Build

Đóng gói extension thành file `.zip` (chỉ chứa `manifest.json` và `src/`) để upload lên GitHub:

```powershell
.\build.ps1
```

Nếu bị chặn bởi execution policy:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

File zip xuất ra ở `dist\subjects-table-extractor-v<version>.zip` (version lấy theo `manifest.json`).

[English Below]  

------------------------------------------------------------------------------  

I made this extension to extract my subjects list from my university's website. Therefore, this is my personal project, maybe it will be useful for you, maybe not. Thanks for coming and reviewing my project  

Main project: [SchedulerRaylibHCMUS](https://github.com/hongphuchcmus/SchedulerRaylibHCMUS)
