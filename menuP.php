<?php
 
 @session_start();
 
?>

<nav>
       
<div class="logo">サインアップ</div>
        <div class="links">
            <ul class="nav-itens">
               <li><a href="pesquisar.php"> Pesquisar </a></li>
               <li><a href="listar.php"> Lista </a></li>
               <li><a href="cad_contato.php"> Incluir </a></li>
            </ul>
        </div>
        
        <div class="search-box"> 
             <input type="text" class="search-txt" placeholder="" id="txtPesquisar" onkeyup="pesquisar(this.value)">
             <a href="#"  class="search-btn">
             <img src="img/lupa.svg" alt="Lupa" height="20" width="20">
        </div>

        <?php
         if(isset($_SESSION['login']) && $_SESSION['login'] == true) {
          echo "<li>Olá $_SESSION[nome], Bem Vindo de volta!!</li>";
          echo "<div class=btn>";
          echo "<button class=cadastro><a href=logoff.php>Sair</a></button>";
         } else {
            echo "<button class=cadastro><a href=login.php>Entrar</a></button>";
         }
        ?>
    
        </nav>
